import { createContext, useContext } from "react";
import type { Page, FileRecord, ImagePurpose } from "./types";
export type AppContextType = {
  admin: boolean;
  pages: Page[];
  currentId: string;
  openPage: (id: string) => void;
  notify: (message: string) => void;
  createPage: (
    parentId?: string | null,
    options?: { title?: string; open?: boolean },
  ) => Promise<Page | null>;
  chooseImage: (
    purpose: ImagePurpose,
    onSelect?: (file: FileRecord) => void,
  ) => void;
  zoomImage: (src:string,alt?:string)=>void;
  chooseDatabase: (callback:(id:string)=>void)=>void;
  chooseForm: (callback:(id:string)=>void)=>void;
  renameFile: (file: FileRecord, onRename?: (file: FileRecord) => void) => void;
};
export const AppContext = createContext<AppContextType>({
  admin: false,
  pages: [],
  currentId: "",
  openPage: () => {},
  notify: () => {},
  createPage: async () => null,
  chooseImage: () => {},
  renameFile: () => {},
  zoomImage: ()=>{},
  chooseDatabase: ()=>{},
  chooseForm: ()=>{},
});
export const useApp = () => useContext(AppContext);
