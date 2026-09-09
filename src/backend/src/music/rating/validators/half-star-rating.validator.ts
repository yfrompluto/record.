// =============================================================
//		Common validator for the star rating scale
//		A validator is a way to have a standard "rule" for a data;
//			- must be a number (0.5 - 5)
//			- inc by 0.5 (e.g; two ans a half stars)
//			- req protection; can only accept a multiple of 0.5 
// =============================================================

import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

export function IsHalfStarRating(validationOptions?: ValidationOptions) {
	return function (object: Object, propertyName: string) {
		registerDecorator({
			name: 'isHalfStarRating',
			target: object.constructor,
			propertyName,
			options: validationOptions,
			validator: {
			validate(value: any) {
				return (
					typeof value === 'number' &&
					value >= 0.5 &&
					value <= 5 &&
					(value * 2) % 1 === 0
				);
			},
			defaultMessage(args: ValidationArguments) {
				return `${args.property} must be between 0.5 and 5 | inc by 0.5`;
			},
			},
		});
	};
}