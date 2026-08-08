async function fetchWithETag_old(filename, url) {
    const storedETag = localStorage.getItem(filename + "_etag");
    const headers = storedETag ? { "If-None-Match": storedETag } : {};

    const response = await fetch(url, { headers });
    if (response.status === 200) {
        const etag = response.headers.get("ETag");
        const text = await response.text();
        localStorage.setItem(filename + "_etag", etag);
        localStorage.setItem(filename + "_data", text);
        return text;
    } else if (response.status === 304) {
        return localStorage.getItem(filename + "_data");
    } else {
        console.error("Fehler beim Laden von", filename, response.status);
        return null;
    }
}

export async function fetchWithETag(filename, url, encoding = "utf-8") {
    const response = await fetch(url, {
        cache: "no-cache"
    });

    if (response.status === 200) {
        const buffer = await response.arrayBuffer();
        const text = new TextDecoder(encoding).decode(buffer);

        localStorage.setItem(filename + "_data", text);
        return text;
    } else {
        console.error("Fehler beim Laden von", filename, response.status);
        return localStorage.getItem(filename + "_data");
    }
}
