import { describe,it,expect } from 'vitest';
import { can, emptyPermissions, customizationAction, FEATURES, ACTIONS } from '@/lib/permissions';

describe('Feature permissions',()=>{
  it('the global super administrator retains every feature action',()=>{
    const access={isSuperAdmin:true,permissions:emptyPermissions()};
    for(const f of ['cards','themes','qr','fonts','templates'] as const) for(const a of ['view','add','edit','delete'] as const) expect(can(access,f,a)).toBe(true);
  });
  it('view-only access cannot add, edit or delete',()=>{
    const permissions=emptyPermissions();
    for(const {key} of FEATURES) permissions[key].view=true;
    for(const {key} of FEATURES){expect(can({isSuperAdmin:false,permissions},key,'view')).toBe(true);for(const a of ['add','edit','delete'] as const)expect(can({isSuperAdmin:false,permissions},key,a)).toBe(false);}
  });
  it('each action is independent and cannot enable another feature',()=>{
    for(const feature of FEATURES)for(const action of ACTIONS){
      const permissions=emptyPermissions();permissions[feature.key].view=true;permissions[feature.key][action]=true;
      for(const other of FEATURES)for(const a of ACTIONS)expect(can({isSuperAdmin:false,permissions},other.key,a)).toBe(other.key===feature.key&&(a==='view'||a===action));
    }
  });
  it('hiding a feature disables its actions',()=>{
    const permissions=emptyPermissions(true);permissions.qr.view=false;
    for(const action of ACTIONS)expect(can({isSuperAdmin:false,permissions},'qr',action)).toBe(false);
  });
  it('adding, replacing and removing a theme use their respective grants',()=>{
    expect(customizationAction('royal','emerald','royal')).toBe('add');
    expect(customizationAction('emerald','ocean','royal')).toBe('edit');
    expect(customizationAction('emerald','royal','royal')).toBe('delete');
  });
  it('adding, replacing and removing a font use their respective grants',()=>{
    expect(customizationAction('classic','modern','classic')).toBe('add');
    expect(customizationAction('modern','friendly','classic')).toBe('edit');
    expect(customizationAction('modern','classic','classic')).toBe('delete');
  });
});