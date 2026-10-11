interface IToolAuth {
    type: string;
    placement?: string;
    paramName?: string;
}

/** Whether two auth settings send the credential the same way. */
export const sameAuth = (a: IToolAuth, b: IToolAuth | undefined): boolean =>
    a.type === b?.type &&
    (a.placement ?? 'header') === (b?.placement ?? 'header') &&
    (a.paramName || undefined) === (b?.paramName || undefined);
