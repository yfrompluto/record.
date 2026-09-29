import { IsInt } from 'class-validator'

export class FriendRequestDto {
	@IsInt()
	addresseeId: number;
}
