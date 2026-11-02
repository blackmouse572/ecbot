import {
    CHAT_UPLOAD_FILE_EXTENSIONS,
    CHAT_UPLOAD_FILE_MAX_BYTES,
    MESSAGE_MEDIA_MAX_BYTES,
} from '@app/modules/conversation/constants/message-media.constant';
import { MediaLimits } from '../interfaces/message-model';

/** Every document type the inbox can attach (PDF, Word, Excel, text, CSV). */
const DOCUMENTS = Object.keys(CHAT_UPLOAD_FILE_EXTENSIONS);

/** What a channel takes from the inbox reply box: photos of these types up
 *  to 5 MB and, when `files` is true, any document up to 10 MB. */
export function uploadLimits(
    imageTypes: string[],
    files: boolean
): MediaLimits {
    return {
        image: { maxBytes: MESSAGE_MEDIA_MAX_BYTES, types: imageTypes },
        ...(files && {
            file: { maxBytes: CHAT_UPLOAD_FILE_MAX_BYTES, types: DOCUMENTS },
        }),
    };
}
