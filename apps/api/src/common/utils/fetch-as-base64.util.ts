import axios from 'axios';

export async function fetchAsBase64(url: string): Promise<string | undefined> {
    if (!url) return undefined;
    try {
        const response = await axios.get<ArrayBuffer>(url, {
            responseType: 'arraybuffer',
            timeout: 5000,
        });
        const contentType = (
            (response.headers['content-type'] as string | undefined) ??
            'image/jpeg'
        )
            .split(';')[0]
            .trim();
        const base64 = Buffer.from(response.data).toString('base64');
        return `data:${contentType};base64,${base64}`;
    } catch {
        return undefined;
    }
}
