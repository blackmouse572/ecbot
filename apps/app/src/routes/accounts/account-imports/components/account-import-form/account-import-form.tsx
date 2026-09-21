import { RouteFocusModal } from "@/components/modals";
import { downloadFile, fetchFileFromPath, formatFileSize } from "@/utils";
import { ArrowDownTray } from "@medusajs/icons";
import {
  Button,
  clx,
  Container,
  Heading,
  Input,
  Label,
  Text,
} from "@medusajs/ui";
import FileThumbnailIcon from "public/icons/file-thumbnail.svg?react";
import type React from "react";
import { useEffect, useState, type HTMLProps } from "react";
import { useTranslation } from "react-i18next";

const importTemplateFilePath = "/public/import-template.csv";

export const ImportPanelForm = () => {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>();
  const [importTemplateFile, setImportTemplateFile] = useState<File | null>();
  const [updatedRowCount, setUpdatedRowCount] = useState(0);

  const setRowUpdatedHandler = async (file: File) => {
    const text = await file.text();
    const rowCount = text.trim().split("\n");
    setUpdatedRowCount(rowCount.length - 1);
  };

  const setImportTemplateFileHandler = async () => {
    const importTemplateFileContent = await fetchFileFromPath(
      importTemplateFilePath,
      "import-template.csv",
    );
    setImportTemplateFile(importTemplateFileContent);
  };

  useEffect(() => {
    if (file) setRowUpdatedHandler(file);
  }, [file]);

  useEffect(() => {
    setImportTemplateFileHandler();
  }, []);

  return (
    <RouteFocusModal>
      <RouteFocusModal.Header className="focus-modal-header-reverse">
        <Heading>{t("accounts.imports.title")}</Heading>
      </RouteFocusModal.Header>
      <RouteFocusModal.Body className="flex flex-col p-16 gap-6">
        <div className="grid gap-2">
          <Heading>{t("accounts.imports.upload.title")}</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            {t("accounts.imports.upload.description", {
              object: "account",
            })}
          </Text>
          {!file ? (
            <Label
              htmlFor="input-csv-file"
              className="bg-gray-50 outline-dashed border-none outline-gray-300 flex flex-col items-center rounded-xl p-4 cursor-pointer"
            >
              <div className="flex gap-2 items-center">
                <ArrowDownTray />
                <Text>{t("accounts.imports.upload.importFiles")}</Text>
              </div>
              <Text size="small" className="text-ui-fg-subtle">
                {t("accounts.imports.upload.importFilesDesc")}
              </Text>
            </Label>
          ) : (
            <FileContainer file={file} onClick={() => setFile(null)} />
          )}
          <Input
            type="file"
            className="hidden"
            id="input-csv-file"
            accept=".csv"
            onChange={(e) => {
              const selectedFile = e.target.files?.[0] || null;
              setFile(selectedFile);
            }}
          />
          {!!file && (
            <Container className="grid grid-cols-2 bg-gray-50 px-0">
              <div className="grid px-6">
                <Heading>{updatedRowCount}</Heading>
                <Text size="small" className="text-ui-fg-subtle">
                  {t("accounts.imports.upload.itemCreated")}
                </Text>
              </div>
              <div className="grid border-l px-6">
                <Heading>0</Heading>
                <Text size="small" className="text-ui-fg-subtle">
                  {t("accounts.imports.upload.itemUpdated")}
                </Text>
              </div>
            </Container>
          )}
        </div>
        <div className="grid gap-2">
          <Heading>{t("accounts.imports.template.title")}</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            {t("accounts.imports.template.description")}
          </Text>
          {importTemplateFile && <FileContainer file={importTemplateFile} />}
        </div>
      </RouteFocusModal.Body>
      <RouteFocusModal.Footer>
        <RouteFocusModal.Close asChild>
          <Button variant="secondary">{t("actions.cancel")}</Button>
        </RouteFocusModal.Close>
        <Button variant="primary" type="submit">
          {t("actions.save")}
        </Button>
      </RouteFocusModal.Footer>
    </RouteFocusModal>
  );
};

interface FileContainerProps extends HTMLProps<HTMLDivElement> {
  file: File;
}

const FileContainer: React.FC<FileContainerProps> = ({
  file,
  className,
  ...props
}) => {
  return (
    <Container
      className={clx("flex items-center gap-4 bg-gray-50", className)}
      {...props}
    >
      <FileThumbnailIcon />
      <div className="flex-1">
        <Text>{file.name}</Text>
        <Text size="small" className="text-ui-fg-subtle">
          {formatFileSize(file.size)}
        </Text>
      </div>
      <Button
        variant="transparent"
        className="z-10"
        onClick={(e) => {
          e.stopPropagation();
          downloadFile(file);
        }}
      >
        <ArrowDownTray />
      </Button>
    </Container>
  );
};
