import { IMediaPart } from '@app/modules/chatbot/interfaces/media-part-wire.interface';
import { ReplySegment } from '../interfaces/message-model';

/**
 * Cuts a streamed reply into the segments delivery sends, one call per part.
 * A segment ends at a tool call, at the end of the stream, and (when
 * `splitParagraphs`) at each blank line. Media (an image or a PDF) waits for
 * the text of the segment it arrives in, so it is sent after that text; with
 * no text open (a `send_media` right after a tool call) it goes out on its
 * own at once.
 */
export class ReplySegmenter {
    private text = '';
    private media: IMediaPart[] = [];

    constructor(
        private readonly onSegment: (segment: ReplySegment) => void,
        private readonly splitParagraphs: boolean
    ) {}

    addText(delta: string): void {
        this.text += delta;
        if (!this.splitParagraphs) return;
        let i: number;
        while ((i = this.text.indexOf('\n\n')) !== -1) {
            const paragraph = this.text.slice(0, i);
            this.text = this.text.slice(i + 2);
            this.emit(paragraph);
        }
    }

    addMedia(media: IMediaPart): void {
        if (this.text.trim()) this.media.push(media);
        else this.onSegment({ text: '', media: [media] });
    }

    /** Close the open segment (a tool call, or the end of the stream). */
    close(): void {
        const rest = this.text;
        this.text = '';
        this.emit(rest);
    }

    /** Forget the open segment without sending it (the reply was discarded). */
    reset(): void {
        this.text = '';
        this.media = [];
    }

    private emit(text: string): void {
        const media = this.media;
        this.media = [];
        if (text.trim() || media.length) {
            this.onSegment({ text: text.trim(), media });
        }
    }
}
