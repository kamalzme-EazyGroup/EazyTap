import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';
import { ACTIONS, FEATURES, emptyPermissions } from './permissions';

export const getAccess = createServerFn({method:'GET'}).middleware([requireSupabaseAuth]).handler(async ({context}) => {
  const {data: isSuperAdmin,error} = await context.supabase.rpc('is_super_admin');
  if(error) throw new Error('Unable to load account access');
  const permissions = emptyPermissions();
  await Promise.all(FEATURES.flatMap(({key}) => ACTIONS.map(async action => {
    const {data,error} = await context.supabase.rpc('has_feature_permission',{p_feature:key,p_action:action});
    if(error) throw new Error('Unable to load account permissions');
    permissions[key][action] = Boolean(data);
  })));
  return {isSuperAdmin:Boolean(isSuperAdmin),permissions};
});

export const getAdminConsole = createServerFn({method:'GET'}).middleware([requireSupabaseAuth]).handler(async ({context}) => {
  const {data: allowed,error} = await context.supabase.rpc('is_super_admin');
  if(error || !allowed) throw new Error('Only the global super administrator can open this console');
  const {supabaseAdmin} = await import('@/integrations/supabase/client.server');
  const [orgs,accounts,permissions] = await Promise.all([
    context.supabase.from('organizations').select('*').order('created_at'),
    context.supabase.from('managed_accounts').select('*'),
    context.supabase.from('feature_permissions').select('*'),
  ]);
  if(orgs.error || accounts.error || permissions.error) throw new Error('Unable to load the admin console');
  const users: {id:string;email:string;confirmed:boolean}[] = [];
  for(let page=1;;page++) {
    const {data,error} = await supabaseAdmin.auth.admin.listUsers({page,perPage:1000});
    if(error) throw new Error('Unable to load users');
    users.push(...data.users.map(u => ({id:u.id,email:u.email ?? '',confirmed:Boolean(u.email_confirmed_at)})));
    if(data.users.length<1000) break;
  }
  return {organizations:orgs.data,accounts:accounts.data,permissionRows:permissions.data,users};
});

const grantsSchema = z.object({view:z.boolean(),add:z.boolean(),edit:z.boolean(),delete:z.boolean()});
const permissionsSchema = z.object({cards:grantsSchema,themes:grantsSchema,qr:grantsSchema,fonts:grantsSchema,templates:grantsSchema});
export const saveAdminPermissions = createServerFn({method:'POST'}).middleware([requireSupabaseAuth])
  .inputValidator(z.object({userId:z.string().uuid().nullable(),organizationId:z.string().uuid().nullable(),permissions:permissionsSchema}).refine(v => Boolean(v.userId) !== Boolean(v.organizationId)))
  .handler(async ({data,context}) => {
    const {data:allowed,error} = await context.supabase.rpc('is_super_admin');
    if(error || !allowed) throw new Error('Not permitted');
    if(data.userId) {
      const {supabaseAdmin} = await import('@/integrations/supabase/client.server');
      const {data:u,error:e} = await supabaseAdmin.auth.admin.getUserById(data.userId);
      if(e || !u.user?.email) throw new Error('User not found');
      const {error:accountError} = await context.supabase.from('managed_accounts').upsert({user_id:data.userId,email:u.user.email},{onConflict:'user_id',ignoreDuplicates:true});
      if(accountError) throw new Error('Unable to manage this account');
    }
    // One transaction prevents a partially saved permission matrix.
    const {error:saveError} = await context.supabase.rpc('set_permission_matrix',{p_target:{userId:data.userId,organizationId:data.organizationId},p_permissions:data.permissions});
    if(saveError) throw new Error('Unable to save permissions');
    return {ok:true};
  });

export const createOrganization = createServerFn({method:'POST'}).middleware([requireSupabaseAuth])
  .inputValidator(z.object({name:z.string().trim().min(1).max(120)}))
  .handler(async ({data,context}) => {
    const {data:allowed,error} = await context.supabase.rpc('is_super_admin');
    if(error || !allowed) throw new Error('Not permitted');
    const {data:org,error:e} = await context.supabase.from('organizations').insert({name:data.name}).select().single();
    if(e) throw new Error('Unable to create organization');
    const {error:p} = await context.supabase.rpc('set_permission_matrix',{p_target:{organizationId:org.id},p_permissions:emptyPermissions()});
    if(p) throw new Error('Organization created, but its permissions could not be saved');
    return org;
  });

export const createManagedUser = createServerFn({method:'POST'}).middleware([requireSupabaseAuth])
  .inputValidator(z.object({email:z.string().trim().email(),organizationId:z.string().uuid().nullable()}))
  .handler(async ({data,context}) => {
    const {data:allowed,error} = await context.supabase.rpc('is_super_admin');
    if(error || !allowed) throw new Error('Not permitted');
    if(data.organizationId) {
      const {data:org,error:e} = await context.supabase.from('organizations').select('id').eq('id',data.organizationId).single();
      if(e || !org) throw new Error('Organization not found');
    }
    const {supabaseAdmin} = await import('@/integrations/supabase/client.server');
    let userId:string|undefined;
    for(let page=1;;page++) {
      const {data:users,error:e} = await supabaseAdmin.auth.admin.listUsers({page,perPage:1000});
      if(e) throw new Error('Unable to find account');
      userId=users.users.find(u => u.email?.toLowerCase()===data.email.toLowerCase())?.id;
      if(userId || users.users.length<1000) break;
    }
    let invited=false;
    if(!userId) {
      const {data:u,error:e} = await supabaseAdmin.auth.admin.inviteUserByEmail(data.email);
      if(e || !u.user) throw new Error('Unable to send the invitation. Check the email address and try again.');
      userId=u.user.id; invited=true;
    }
    const {error:e} = await context.supabase.from('managed_accounts').upsert({user_id:userId,email:data.email,organization_id:data.organizationId});
    if(e) throw new Error('Unable to save account membership');
    if(!data.organizationId) {
      const {error:p} = await context.supabase.rpc('set_permission_matrix',{p_target:{userId},p_permissions:emptyPermissions()});
      if(p) throw new Error('Unable to set initial permissions');
    }
    return {userId,invited};
  });