import { useSearchParams } from "react-router-dom";

export const useSelectedParams = ({
  param,
  prefix,
  multiple = false,
}: {
  param: string;
  prefix?: string;
  multiple?: boolean;
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const identifier = prefix ? `${prefix}_${param}` : param;
  const offsetKey = prefix ? `${prefix}_offset` : "offset";
  const pageKey = prefix ? `${prefix}_page` : "page";

  const add = (value: string) => {
    setSearchParams((prev) => {
      const newValue = new URLSearchParams(prev);

      const updateMultipleValues = () => {
        const existingValues = newValue.get(identifier)?.split(",") || [];

        if (!existingValues.includes(value)) {
          existingValues.push(value);
          newValue.set(identifier, existingValues.join(","));
        }
      };

      const updateSingleValue = () => {
        newValue.set(identifier, value);
      };

      const updateFn = multiple ? updateMultipleValues : updateSingleValue;
      updateFn();
      newValue.delete(offsetKey);
      // Reset to the first page whenever a filter/search changes, so we never
      // land on a now-out-of-range page (the table paginates via `page`).
      newValue.delete(pageKey);

      return newValue;
    });
  };

  const deleteParam = (value?: string) => {
    const deleteMultipleValues = (prev: URLSearchParams) => {
      const existingValues = prev.get(identifier)?.split(",") || [];
      const index = existingValues.indexOf(value || "");
      if (index > -1) {
        existingValues.splice(index, 1);
        prev.set(identifier, existingValues.join(","));
      }
    };

    const deleteSingleValue = (prev: URLSearchParams) => {
      prev.delete(identifier);
    };

    setSearchParams((prev) => {
      if (value) {
        const deleteFn = multiple ? deleteMultipleValues : deleteSingleValue;
        deleteFn(prev);
        if (!prev.get(identifier)) {
          prev.delete(identifier);
        }
      } else {
        prev.delete(identifier);
      }
      prev.delete(offsetKey);
      prev.delete(pageKey);
      return prev;
    });
  };

  const get = () => {
    return searchParams.get(identifier)?.split(",").filter(Boolean) || [];
  };

  return { add, delete: deleteParam, get };
};
