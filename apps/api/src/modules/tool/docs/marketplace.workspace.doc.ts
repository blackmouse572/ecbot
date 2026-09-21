import { WorkspaceDocParamsId } from '@app/modules/workspace/constants/workspace.doc.constant';
import { HttpStatus, applyDecorators } from '@nestjs/common';
import { ApiQuery } from '@nestjs/swagger';
import {
    Doc,
    DocAuth,
    DocGuard,
    DocRequest,
    DocResponse,
    DocResponsePaging,
} from 'src/common/doc/decorators/doc.decorator';
import { ENUM_DOC_REQUEST_BODY_TYPE } from 'src/common/doc/enums/doc.enum';
import { CompleteInstallRequestDto } from 'src/modules/tool/dtos/request/complete-install.request.dto';
import { InstallMarketplaceRequestDto } from 'src/modules/tool/dtos/request/install-marketplace.request.dto';
import { ReauthMarketplaceRequestDto } from 'src/modules/tool/dtos/request/reauth-marketplace.request.dto';
import {
    ComposioToolkitCategoryDto,
    ComposioToolkitDetailResponseDto,
    ComposioToolkitResponseDto,
} from 'src/modules/tool/dtos/response/composio-toolkit.response.dto';
import { ToolInstallResponseDto } from '../dtos/response/tool-install.response.dto';

export function MarketplaceWorkspaceCatalogDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'list Composio marketplace toolkits (paginated)',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocRequest({
            params: [...WorkspaceDocParamsId],
        }),
        DocGuard({ role: true, policy: true }),
        ApiQuery({
            name: 'category',
            required: false,
            allowEmptyValue: true,
            type: 'string',
            description: 'Filter by toolkit category name',
        }),
        DocResponsePaging('tool.marketplace.catalog.success', {
            httpStatus: HttpStatus.OK,
            dto: ComposioToolkitResponseDto,
        })
    );
}

export function MarketplaceWorkspaceCategoriesDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'list Composio marketplace toolkit categories',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocRequest({
            params: [...WorkspaceDocParamsId],
        }),
        DocGuard({ role: true, policy: true }),
        DocResponse('tool.marketplace.categories.success', {
            httpStatus: HttpStatus.OK,
            dto: ComposioToolkitCategoryDto,
        })
    );
}

export function MarketplaceWorkspaceInstallDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'initiate Composio toolkit install',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true }),
        DocRequest({
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: InstallMarketplaceRequestDto,
            params: [...WorkspaceDocParamsId],
        }),
        DocResponse('tool.marketplace.install.success', {
            httpStatus: HttpStatus.CREATED,
            dto: ToolInstallResponseDto,
        })
    );
}

export function MarketplaceWorkspaceToolkitDetailDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get Composio toolkit detail by slug',
        }),
        DocRequest({
            params: [
                ...WorkspaceDocParamsId,
                { name: 'slug', description: 'the slug of the toolkit' },
            ],
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true }),
        DocResponse('tool.marketplace.toolkit.success', {
            httpStatus: HttpStatus.OK,
            dto: ComposioToolkitDetailResponseDto,
        })
    );
}

export function MarketplaceWorkspaceReauthDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 're-authenticate an existing PENDING_AUTH Composio tool',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true }),
        DocRequest({
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: ReauthMarketplaceRequestDto,
            params: [...WorkspaceDocParamsId],
        }),
        DocResponse('tool.marketplace.install.success', {
            httpStatus: HttpStatus.CREATED,
            dto: ToolInstallResponseDto,
        })
    );
}

export function MarketplaceWorkspaceCompleteInstallDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'complete Composio toolkit install',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true }),
        DocRequest({
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: CompleteInstallRequestDto,
        }),
        DocResponse('tool.marketplace.complete.success')
    );
}
