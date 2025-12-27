/**
 * @fileoverview Data Transfer Objects (DTOs) with validation schemas.
 * Provides type-safe input validation for API requests.
 * @module types/dto
 */

import { body, query, param, ValidationChain } from 'express-validator';

/**
 * Task creation DTO validation rules
 */
export const CreateTaskDTO: ValidationChain[] = [
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required')
    .isLength({ min: 1, max: 500 }).withMessage('Title must be between 1 and 500 characters')
    .escape(), // Additional XSS protection
  
  body('description')
    .optional()
    .isLength({ max: 10000 }).withMessage('Description must be less than 10000 characters'),
  
  body('column_id')
    .notEmpty().withMessage('Column ID is required')
    .isInt({ min: 1 }).withMessage('Column ID must be a positive integer')
    .toInt(),
  
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'critical']).withMessage('Priority must be low, medium, high, or critical'),
  
  body('due_date')
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601().withMessage('Due date must be a valid ISO 8601 date')
    .toDate(),
  
  body('assigned_to')
    .optional({ nullable: true })
    .isInt({ min: 1 }).withMessage('Assigned to must be a positive integer')
    .toInt(),
  
  body('swimlane_id')
    .optional({ nullable: true })
    .isInt({ min: 1 }).withMessage('Swimlane ID must be a positive integer')
    .toInt(),
  
  body('tags')
    .optional()
    .isArray().withMessage('Tags must be an array'),
  
  body('tags.*')
    .optional()
    .isInt({ min: 1 }).withMessage('Each tag ID must be a positive integer')
    .toInt(),
  
  body('subtasks')
    .optional()
    .isArray().withMessage('Subtasks must be an array'),
  
  body('subtasks.*.title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 500 }).withMessage('Subtask title must be between 1 and 500 characters'),
  
  body('subtasks.*.completed')
    .optional()
    .isBoolean().withMessage('Subtask completed must be a boolean')
    .toBoolean()
];

/**
 * Task update DTO validation rules
 */
export const UpdateTaskDTO: ValidationChain[] = [
  param('id')
    .isInt({ min: 1 }).withMessage('Task ID must be a positive integer')
    .toInt(),
  
  body('title')
    .optional()
    .trim()
    .notEmpty().withMessage('Title cannot be empty')
    .isLength({ min: 1, max: 500 }).withMessage('Title must be between 1 and 500 characters')
    .escape(),
  
  body('description')
    .optional()
    .isLength({ max: 10000 }).withMessage('Description must be less than 10000 characters'),
  
  body('column_id')
    .optional()
    .isInt({ min: 1 }).withMessage('Column ID must be a positive integer')
    .toInt(),
  
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'critical']).withMessage('Priority must be low, medium, high, or critical'),
  
  body('due_date')
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601().withMessage('Due date must be a valid ISO 8601 date')
    .toDate(),
  
  body('status')
    .optional()
    .isIn(['todo', 'in_progress', 'completed']).withMessage('Status must be todo, in_progress, or completed')
];

/**
 * Board creation DTO validation rules
 */
export const CreateBoardDTO: ValidationChain[] = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 1, max: 200 }).withMessage('Name must be between 1 and 200 characters')
    .escape(),
  
  body('description')
    .optional()
    .isLength({ max: 1000 }).withMessage('Description must be less than 1000 characters'),
  
  body('template')
    .optional()
    .isIn(['simple', 'kanban', 'scrum', 'custom']).withMessage('Invalid template type')
];

/**
 * User registration DTO validation rules
 */
export const RegisterUserDTO: ValidationChain[] = [
  body('username')
    .trim()
    .notEmpty().withMessage('Username is required')
    .isLength({ min: 3, max: 50 }).withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_-]+$/).withMessage('Username can only contain letters, numbers, underscores, and hyphens')
    .escape(),
  
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Must be a valid email address')
    .normalizeEmail(),
  
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8, max: 128 }).withMessage('Password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number')
];

/**
 * User login DTO validation rules
 */
export const LoginUserDTO: ValidationChain[] = [
  body('username')
    .trim()
    .notEmpty().withMessage('Username is required')
    .escape(),
  
  body('password')
    .notEmpty().withMessage('Password is required')
];

/**
 * Pagination query DTO validation rules
 */
export const PaginationDTO: ValidationChain[] = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer')
    .toInt(),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
    .toInt(),
  
  query('sortBy')
    .optional()
    .isString().withMessage('Sort by must be a string')
    .trim()
    .escape(),
  
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc')
];

/**
 * ID parameter DTO validation rule
 */
export const IdParamDTO: ValidationChain[] = [
  param('id')
    .isInt({ min: 1 }).withMessage('ID must be a positive integer')
    .toInt()
];

/**
 * Date range query DTO validation rules
 */
export const DateRangeDTO: ValidationChain[] = [
  query('startDate')
    .optional()
    .isISO8601().withMessage('Start date must be a valid ISO 8601 date')
    .toDate(),
  
  query('endDate')
    .optional()
    .isISO8601().withMessage('End date must be a valid ISO 8601 date')
    .toDate()
];

/**
 * Search query DTO validation rules
 */
export const SearchDTO: ValidationChain[] = [
  query('q')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 }).withMessage('Search query must be between 1 and 200 characters')
    .escape(),
  
  query('fields')
    .optional()
    .isString().withMessage('Fields must be a comma-separated string')
];

/**
 * File upload DTO validation rules
 */
export const FileUploadDTO: ValidationChain[] = [
  body('taskId')
    .optional()
    .isInt({ min: 1 }).withMessage('Task ID must be a positive integer')
    .toInt(),
  
  body('description')
    .optional()
    .isLength({ max: 500 }).withMessage('Description must be less than 500 characters')
];

/**
 * Combine validation chains for complex DTOs
 */
export function combineValidations(...validationGroups: ValidationChain[][]): ValidationChain[] {
  return validationGroups.flat();
}

/**
 * Custom validator for array of integers
 */
export const arrayOfIntegers = (fieldName: string, required: boolean = false) => {
  const chain = query(fieldName)
    .optional({ nullable: !required })
    .custom((value) => {
      if (typeof value === 'string') {
        const ids = value.split(',').map(id => Number(id.trim()));
        if (ids.some(id => !Number.isInteger(id) || id < 1)) {
          throw new Error(`${fieldName} must contain only positive integers`);
        }
        return true;
      }
      if (Array.isArray(value)) {
        if (value.some(id => !Number.isInteger(Number(id)) || Number(id) < 1)) {
          throw new Error(`${fieldName} must contain only positive integers`);
        }
        return true;
      }
      throw new Error(`${fieldName} must be an array or comma-separated string of integers`);
    });
  
  return required ? chain.notEmpty().withMessage(`${fieldName} is required`) : chain;
};
