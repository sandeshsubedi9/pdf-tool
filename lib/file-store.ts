/**
 * Simple in-memory file store to share File objects between pages
 * during soft navigations without hitting sessionStorage limits.
 */
class FileStore {
    private static store = new Map<string, File>();

    static setFile(key: string, file: File) {
        this.store.set(key, file);
    }

    static getFile(key: string): File | undefined {
        return this.store.get(key);
    }

    static clearFile(key: string) {
        this.store.delete(key);
    }
}

export default FileStore;
