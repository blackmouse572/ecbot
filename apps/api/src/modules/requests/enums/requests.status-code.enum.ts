/*  Sub-error codes will be like 53xxx 
      For example:
      53xx for common request errors 
      531xx for requests related to workspace 
      532xx for requests related to account, etc...
*/

export enum ENUM_REQUEST_STATUS_CODE_ERROR {
    NOT_FOUND = 5300,
    ALREADY_EXISTS = 5301,
    INVALID_TYPE = 5302,
    INVALID_PAYLOAD = 5303,
    REQUEST_ALREADY_ACCEPTED = 5304,
    REQUEST_ALREADY_REJECTED = 5305,
    REQUEST_CREATION_FAILED = 5306,
    REQUEST_UPDATE_FAILED = 5307,
    REQUEST_DELETION_FAILED = 5308,
    DUPLICATED_REQUESTOR = 5309,
    REQUEST_APPROVE_FAILED = 5310,
    REQUEST_CANCEL_FAILED = 5311,
    REQUEST_REJECT_FAILED = 5312,
}

export enum ENUM_WORKSPACE_REQUEST_STATUS_CODE_ERROR {
    NO_WORKSPACE = 53100,
}

export enum ENUM_REQUEST_ACCOUNT_STATUS_CODE_ERROR {}
