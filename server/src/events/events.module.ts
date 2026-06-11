import { Module } from '@nestjs/common';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { EventsController, MeController, WorkspaceEventsController } from './events.controller';
import { EventsService } from './events.service';

@Module({
  imports: [WorkspacesModule],
  controllers: [EventsController, WorkspaceEventsController, MeController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
