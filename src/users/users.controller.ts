import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
} from "@nestjs/common";
import { ListUsersDto } from "./dto/list-users.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UsersService } from "./users.service";

@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  listUsers(@Query() query: ListUsersDto) {
    return this.usersService.list(query.limit, query.page);
  }

  @Get(":id")
  getUser(@Param("id", ParseIntPipe) id: number) {
    return this.usersService.findOneById(id);
  }

  @Patch(":id")
  updateUser(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(id, dto);
  }

  @Delete(":id")
  deleteUser(@Param("id", ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }
}
