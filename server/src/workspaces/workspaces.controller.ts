import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import {
  AcceptInvitationDto,
  CreateWorkspaceDto,
  InviteWorkspaceMemberDto,
  UpdateWorkspaceDto,
  UpdateWorkspaceMemberRoleDto,
  UpdateWorkspacePolicyDto,
  UpdateWorkspaceSettingsDto,
} from './dto/workspace.dto';
import { WorkspacesService } from './workspaces.service';

@ApiTags('Workspaces')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Post('workspaces')
  @ApiOperation({ summary: 'Create a workspace and become its owner' })
  create(@Body() dto: CreateWorkspaceDto, @CurrentUser() user: JwtPayload) {
    return this.workspacesService.create(dto, user.sub);
  }

  @Get('workspaces')
  @ApiOperation({ summary: 'List workspaces for the current user' })
  findMine(@CurrentUser() user: JwtPayload) {
    return this.workspacesService.findMine(user.sub);
  }

  @Get('workspaces/:id')
  @ApiOperation({ summary: 'Get a workspace' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.workspacesService.findOne(id, user.sub);
  }

  @Patch('workspaces/:id')
  @ApiOperation({ summary: 'Update workspace basic details' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWorkspaceDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.workspacesService.update(id, dto, user.sub);
  }

  @Get('workspaces/:id/members')
  @ApiOperation({ summary: 'List workspace members' })
  findMembers(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.workspacesService.findMembers(id, user.sub);
  }

  @Patch('workspaces/:id/members/:userId/role')
  @ApiOperation({ summary: 'Update a workspace member role' })
  updateMemberRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) memberUserId: string,
    @Body() dto: UpdateWorkspaceMemberRoleDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.workspacesService.updateMemberRole(id, memberUserId, dto, user.sub);
  }

  @Get('workspaces/:id/settings')
  @ApiOperation({ summary: 'Get workspace settings' })
  getSettings(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.workspacesService.getSettings(id, user.sub);
  }

  @Patch('workspaces/:id/settings')
  @ApiOperation({ summary: 'Update workspace settings' })
  updateSettings(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWorkspaceSettingsDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.workspacesService.updateSettings(id, dto, user.sub);
  }

  @Get('workspaces/:id/policy')
  @ApiOperation({ summary: 'Get workspace policy' })
  getPolicy(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.workspacesService.getPolicy(id, user.sub);
  }

  @Patch('workspaces/:id/policy')
  @ApiOperation({ summary: 'Update workspace policy' })
  updatePolicy(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWorkspacePolicyDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.workspacesService.updatePolicy(id, dto, user.sub);
  }

  @Post('workspaces/:id/invitations')
  @ApiOperation({ summary: 'Invite a member to a workspace' })
  invite(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: InviteWorkspaceMemberDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.workspacesService.invite(id, dto, user.sub);
  }

  @Get('workspaces/:id/invitations')
  @ApiOperation({ summary: 'List workspace invitations' })
  findInvitations(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.workspacesService.findInvitations(id, user.sub);
  }

  @Post('invitations/:token/accept')
  @ApiOperation({ summary: 'Accept a workspace invitation' })
  acceptByToken(@Param('token') token: string, @CurrentUser() user: JwtPayload) {
    return this.workspacesService.acceptInvitation(token, user.sub, user.email);
  }

  @Post('invitations/accept')
  @ApiOperation({ summary: 'Accept a workspace invitation by token body' })
  accept(@Body() dto: AcceptInvitationDto, @CurrentUser() user: JwtPayload) {
    return this.workspacesService.acceptInvitation(dto.token, user.sub, user.email);
  }
}
