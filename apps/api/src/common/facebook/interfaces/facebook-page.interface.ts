import {
    GetFacebookPageRequestDto,
    GetFacebookPagesRequestDto,
} from '../dtos/facebook-page.request.dto';

export interface FacebookPageInterface {
    getPages: (data: GetFacebookPagesRequestDto) => Promise<any>;
    getPage: (data: GetFacebookPageRequestDto) => Promise<any>;
}
