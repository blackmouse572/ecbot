export interface FacebookAuthInterface {
    getAccessToken: (code: string) => Promise<string>;
    getUserProfile: (accessToken: string) => Promise<any>;
}
