import { queryOptions } from "@tanstack/react-query";
import { getAccess } from "./admin.functions";
export const accessQuery = queryOptions({
  queryKey: ["account-access"],
  queryFn: () => getAccess(),
  staleTime: 0,
});
