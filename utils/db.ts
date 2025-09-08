import { openDB, DBSchema } from 'idb';
import { LibraryImage, Folder, BrandKit } from '../types';

const DB_NAME = 'ai-studio-db';
const IMAGE_STORE_NAME = 'images';
const FOLDER_STORE_NAME = 'folders';
const BRAND_KIT_STORE_NAME = 'brandKits';
const DB_VERSION = 3;

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
  [BRAND_KIT_STORE_NAME]: {
    key: string;
    value: BrandKit;
    indexes: { 'by-name': string };
  }
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
    if (oldVersion < 3) {
        const brandKitStore = db.createObjectStore(BRAND_KIT_STORE_NAME, { keyPath: 'id' });
        brandKitStore.createIndex('by-name', 'name');
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

// BRAND KIT CRUD
export const addBrandKitToDB = async (brandKit: BrandKit): Promise<void> => {
    const db = await dbPromise;
    await db.add(BRAND_KIT_STORE_NAME, brandKit);
};

export const getBrandKitsFromDB = async (): Promise<BrandKit[]> => {
    const db = await dbPromise;
    const kits = await db.getAll(BRAND_KIT_STORE_NAME);
    return kits.sort((a, b) => a.createdAt - b.createdAt);
};

export const updateBrandKitInDB = async (brandKit: BrandKit): Promise<void> => {
    const db = await dbPromise;
    await db.put(BRAND_KIT_STORE_NAME, brandKit);
};

export const deleteBrandKitFromDB = async (kitId: string): Promise<void> => {
    const db = await dbPromise;
    await db.delete(BRAND_KIT_STORE_NAME, kitId);
};

export const clearBrandKitsFromDB = async (): Promise<void> => {
    const db = await dbPromise;
    await db.clear(BRAND_KIT_STORE_NAME);
};