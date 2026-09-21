import { LinkButton as PrimitiveLinkButton } from "@repo/ui/common-components";
import { Link } from "react-router-dom";

interface ILinkButtonProps
  extends
    React.ComponentProps<typeof PrimitiveLinkButton>,
    Pick<
      React.ComponentProps<typeof Link>,
      | "to"
      | "discover"
      | "prefetch"
      | "preventScrollReset"
      | "relative"
      | "reloadDocument"
      | "replace"
      | "state"
      | "viewTransition"
    > {}

const LinkButton: React.FC<ILinkButtonProps> = (props: ILinkButtonProps) => {
  const {
    to,
    children,
    discover,
    prefetch,
    preventScrollReset,
    relative,
    reloadDocument,
    replace,
    state,
    viewTransition,
    ...rest
  } = props;
  return (
    <PrimitiveLinkButton {...rest}>
      <Link
        to={to}
        discover={discover}
        prefetch={prefetch}
        preventScrollReset={preventScrollReset}
        relative={relative}
        reloadDocument={reloadDocument}
        replace={replace}
        state={state}
        viewTransition={viewTransition}
      >
        {children}
      </Link>
    </PrimitiveLinkButton>
  );
};

export { LinkButton };
