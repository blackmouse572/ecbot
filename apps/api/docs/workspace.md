# Overview

**Workspace** is a collection of resources that can be used to organize and manage your projects. It allows you to group related resources (Account, Proxies, etc.) together, making it easier to manage and navigate through your projects.

Every resource in the system is associated with a workspace, which provides a context for that resource. This means that when you create or manage resources, you do so within the scope of a specific workspace.

# Table of Contents

- [Overview](#overview)
- [Table of Contents](#table-of-contents)
    - [Workspace Controlled](#workspace-controlled)

## Workspace Controlled

Workspace control refers to the ability to manage and restrict access to resources within a specific workspace. This includes defining who can access the workspace, what actions they can perform, and how resources are organized within the workspace.

- **Purpose**: Organize and manage resources related to a project
- **Implementation**:
    - Each resource (e.g., Account, Proxies) is associated with a workspace.
    - Resources can be created, updated, and deleted within the context of a workspace.
    - Access control is enforced based on the workspace to ensure that users can only interact with resources they have permission to access.

The based setup of each resources should have a `workspaceId` field in the model, which links the resource to a specific workspace. This allows for easy filtering and management of resources based on the workspace context.

```typescript
@DatabaseEntity({ collection: AccountTableName })
export class AccountEntity extends DatabaseEntityBase {
    @DatabaseProps({
        ref: WorkspaceEntity.name,
    })
    workspaceId: string;

    // Other fields...
}
```

For **Controller** the parameters should include the `workspaceId` to ensure that all operations are performed within the context of the specified workspace.

```typescript
@Controller('/:workspaceId/accounts')
```

## Workspace Protected

To protect the route we can use the **Workspace decorator** which checks if the user has access to the specified workspace. This guard should be applied to all routes that require workspace context.

There are 3 types of protected decorators that can be used:

- **WorkspaceOwnerProtected**: Checks if the user is the owner of the workspace.
- **WorkspaceMemberProtected**: Checks if the user is a member of the workspace.
- **WorkspaceMemberOrOwnerProtected**: Checks if the user is either a member or the owner of the workspace.

Usage for the guards can be done as follows:

```typescript
    @AccountListDoc()
    @Response('account.list')
    @WorkspaceMemberProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/')
    async list(){}
```

Make sure to apply the appropriate guard based on the access level required for the route. This ensures that only authorized users can access the resources within the workspace.

## Get Workspace from Request Context

To retrive the workspace information, use can use the `@WorkspacePayload()` decorator. This decorator extracts the workspace information from the request context, allowing you to access the workspace details directly in your controller methods.

```typescript
    @Get('/:workspaceId')
    async getWorkspace(@WorkspacePayload() workspace: WorkspaceEntity) {
        return workspace;
    }
```

Make sure to have `:workspaceId` in the route to ensure that the workspace context is correctly set up. The `@WorkspacePayload()` decorator will automatically retrieve the workspace based on the provided `workspaceId`.
