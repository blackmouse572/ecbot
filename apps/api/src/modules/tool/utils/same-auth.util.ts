interface IToolAuth {
    type: string;
    placement?: string;
    paramName?: string;
}

/**
 * Whether two auth settings send the credential the same way. No stored auth
 * (a tool created through the API without one) reads as `none`.
 */
export const sameAuth = (
    a: IToolAuth,
    b: IToolAuth | null | undefined
): boolean =>
    a.type === (b?.type ?? 'none') &&
    (a.placement ?? 'header') === (b?.placement ?? 'header') &&
    (a.paramName || undefined) === (b?.paramName || undefined);
