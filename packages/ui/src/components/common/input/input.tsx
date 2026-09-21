import { Input as MdInput } from "@medusajs/ui";

interface InputProps extends React.ComponentProps<typeof MdInput> {
  errorMessage?: string;
}

const Input = (props: InputProps) => {
  const { errorMessage, ...rest } = props;

  return (
    <div>
      <MdInput
        {...rest}
        aria-invalid={!!errorMessage}
        aria-describedby={errorMessage ? "error-message" : undefined}
      />
      {errorMessage && (
        <p
          className="text-red-500 italic text-xs"
          style={{
            color: "rgba(225, 29, 72, 1)",
          }}
        >
          {errorMessage}
        </p>
      )}
    </div>
  );
};

export { Input };
