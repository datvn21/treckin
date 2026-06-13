import { Module } from "@nestjs/common";
import { WorkspacesModule } from "../workspaces/workspaces.module";
import { EventsController } from "./controllers/events.controller";
import { WorkspaceEventsController } from "./controllers/workspace-events.controller";
import { MeController } from "./controllers/me.controller";
import { EventsService } from "./events.service";

@Module({
  imports: [WorkspacesModule],
  controllers: [EventsController, WorkspaceEventsController, MeController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
