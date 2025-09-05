import { openDB, DBSchema } from 'idb';
import { LibraryImage, Folder } from '../types';

const DB_NAME = 'ai-studio-db';
const IMAGE_STORE_NAME = 'images';
const FOLDER_STORE_NAME = 'folders';
const DB_VERSION = 2;

interface MyDB extends DBSchema {
  [IMAGE_STORE_NAME]: {
    key: string;
    value: LibraryImage;
  };
  [FOLDER_STORE_NAME]: {
    key: string;
    value: Folder;
    indexes: { 'by-name': string };
  };
}

const dbPromise = openDB<MyDB>(DB_NAME, DB_VERSION, {
  upgrade(db, oldVersion) {
    if (oldVersion < 1) {
        db.createObjectStore(IMAGE_STORE_NAME, { keyPath: 'id' });
    }
    if (oldVersion < 2) {
        const folderStore = db.createObjectStore(FOLDER_STORE_NAME, { keyPath: 'id' });
        folderStore.createIndex('by-name', 'name');
    }
  },
});

export const addImagesToDB = async (images: LibraryImage[]): Promise<void> => {
  const db = await dbPromise;
  const tx = db.transaction(IMAGE_STORE_NAME, 'readwrite');
  await Promise.all(images.map(image => tx.store.put(image)));
  await tx.done;
};

export const getImagesFromDB = async (): Promise<LibraryImage[]> => {
  const db = await dbPromise;
  const images = await db.getAll(IMAGE_STORE_NAME);
  return images.sort((a, b) => b.createdAt - a.createdAt);
};

export const updateImageInDB = async(image: LibraryImage): Promise<void> => {
    const db = await dbPromise;
    await db.put(IMAGE_STORE_NAME, image);
}

export const deleteImagesFromDB = async(imageIds: string[]): Promise<void> => {
    const db = await dbPromise;
    const tx = db.transaction(IMAGE_STORE_NAME, 'readwrite');
    await Promise.all(imageIds.map(id => tx.store.delete(id)));
    await tx.done;
}

export const clearImagesFromDB = async (): Promise<void> => {
    const db = await dbPromise;
    await db.clear(IMAGE_STORE_NAME);
};


// FOLDER CRUD
export const addFolderToDB = async (folder: Folder): Promise<void> => {
    const db = await dbPromise;
    await db.add(FOLDER_STORE_NAME, folder);
}

export const getFoldersFromDB = async (): Promise<Folder[]> => {
    const db = await dbPromise;
    const folders = await db.getAll(FOLDER_STORE_NAME);
    return folders.sort((a, b) => a.createdAt - b.createdAt);
}

export const updateFolderInDB = async (folder: Folder): Promise<void> => {
    const db = await dbPromise;
    await db.put(FOLDER_STORE_NAME, folder);
}

export const deleteFolderFromDB = async (folderId: string): Promise<void> => {
    const db = await dbPromise;
    await db.delete(FOLDER_STORE_NAME, folderId);
}

export const clearFoldersFromDB = async (): Promise<void> => {
    const db = await dbPromise;
    await db.clear(FOLDER_STORE_NAME);
};
