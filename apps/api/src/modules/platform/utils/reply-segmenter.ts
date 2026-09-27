import { ReplySegment } from '../interfaces/message-model';

/**
 * Cuts a streamed reply into the segments delivery sends, one call per part.
 * A segment ends at a tool call, at the end of the stream, and (when
 * `splitParagraphs`) at each blank line. An image waits for the text of the
 * segment it arrives in, so it is sent after that text; with no text open
 * (a `send_image` right after a tool call) it goes out on its own at once.
 */
export class ReplySegmenter {
    private text = '';
    private images: string[] = [];

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

    addImage(url: string): void {
        if (this.text.trim()) this.images.push(url);
        else this.onSegment({ text: '', images: [url] });
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
        this.images = [];
    }

    private emit(text: string): void {
        const images = this.images;
        this.images = [];
        if (text.trim() || images.length) {
            this.onSegment({ text: text.trim(), images });
        }
    }
}
