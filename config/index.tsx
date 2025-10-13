import { setIonicStorageConfig, storage } from "../state";
import { setEndpoints } from "../queries";
import { PageConfigProps, setReactIonicPageConfig } from "../pages";
import { initializeI18n } from "../localization";
import { AppLinks, setAppLinks } from "../utiles";
import { setupIonicReact } from "@ionic/react";
import { setFormConfig, FormConfigProps } from "../form";
import { MapConfigProps, setMapConfig } from "@gaddario98/react-ionic-ui";
import {
  setCustomQueryClientConfig,
  CustomQueryClientConfigProps,
} from "@gaddario98/react-providers";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { removeOldestQuery } from "@tanstack/react-query-persist-client";

export interface SetReactNativeConfigProps {
  pages: Partial<PageConfigProps>;
  localResources: Record<string, object>;
  endpoints: Record<string, string>;
  links: Partial<AppLinks>;
  form: Partial<FormConfigProps>;
  map: Partial<MapConfigProps>;
  queryClientConfig?: CustomQueryClientConfigProps;
}

export const setReactIonicConfig = ({
  pages,
  localResources,
  endpoints,
  links,
  form,
  map,
  queryClientConfig,
}: SetReactNativeConfigProps) => {
  setupIonicReact();
  initializeI18n(localResources);
  setIonicStorageConfig();
  setReactIonicPageConfig(pages);
  setEndpoints(endpoints);
  setAppLinks(links);
  setFormConfig(form);
  setMapConfig(map);
  const storagePersister = createAsyncStoragePersister({
    storage: storage,
    retry: removeOldestQuery,
  });
  const customPersistOptions: CustomQueryClientConfigProps["customPersistOptions"] =
    {
      persister: storagePersister,
      maxAge: 1000 * 60 * 60 * 24,
      buster: "persister-ionic-v1",
    };
  setCustomQueryClientConfig({
    ...(queryClientConfig ?? {}),
    customPersistOptions:
      queryClientConfig?.customPersistOptions ?? customPersistOptions,
  });
};
