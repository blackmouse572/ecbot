import {
    Injectable,
    PipeTransform,
    UnprocessableEntityException,
    UnsupportedMediaTypeException,
} from '@nestjs/common';
import { ENUM_FILE_STATUS_CODE_ERROR } from 'src/common/file/enums/file.status-code.enum';
import { IFile } from 'src/common/file/interfaces/file.interface';
import {
    isUtf16Text,
    matchesDeclaredType,
} from 'src/common/file/utils/file-signature.util';

/**
 * Checks an uploaded file's bytes, which FileTypePipe does not (it trusts the
 * client-declared mimetype): an empty file or one whose content does not fit
 * its type is refused at upload rather than failing later at processing.
 */
@Injectable()
export class FileContentPipe implements PipeTransform {
    async transform(file?: IFile): Promise<IFile | undefined> {
        if (!file) {
            return file;
        }

        if (!file.size || !file.buffer?.length) {
            throw new UnprocessableEntityException({
                statusCode: ENUM_FILE_STATUS_CODE_ERROR.EMPTY,
                message: 'file.error.empty',
            });
        }

        if (isUtf16Text(file.mimetype, file.buffer)) {
            throw new UnsupportedMediaTypeException({
                statusCode: ENUM_FILE_STATUS_CODE_ERROR.TEXT_NOT_UTF8,
                message: 'file.error.textNotUtf8',
            });
        }

        if (!matchesDeclaredType(file.mimetype, file.buffer)) {
            throw new UnsupportedMediaTypeException({
                statusCode: ENUM_FILE_STATUS_CODE_ERROR.CONTENT_MISMATCH,
                message: 'file.error.contentMismatch',
            });
        }

        return file;
    }
}
