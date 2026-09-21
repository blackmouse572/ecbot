import { Injectable } from '@nestjs/common';
import { IHelperAvatarService } from 'src/common/helper/interfaces/helper.avatar-service.interface';

const DICEBEAR_BASE_URL = 'https://api.dicebear.com/10.x';

@Injectable()
export class HelperAvatarService implements IHelperAvatarService {
    // Grayscale thumbs, used for user profile avatars.
    generateUserAvatar(seed: string): string {
        return (
            `${DICEBEAR_BASE_URL}/thumbs/svg?seed=${encodeURIComponent(seed)}` +
            '&backgroundColor=343437,5e5e62,8c8c90,b6b6b9' +
            '&shapeColor=c4c4c8,9a9a9e,6e6e72'
        );
    }

    // Loops, close-up scale, used for workspace avatars.
    generateWorkspaceAvatar(seed: string): string {
        return `${DICEBEAR_BASE_URL}/loops/svg?seed=${encodeURIComponent(seed)}&scale=1.4`;
    }
}
