"use client";

import React from "react";

// ============================================================
// 通用表单字段类型定义
// ============================================================

export type FieldType =
  | "text"
  | "phone"
  | "email"
  | "number"
  | "money"
  | "textarea"
  | "select"
  | "multi-select"
  | "radio"
  | "checkbox"
  | "date"
  | "datetime"
  | "cascader"
  | "search-select"
  | "file"
  | "rich-text"
  | "switch"
  | "color";

export interface SelectOption {
  label: string;
  value: string | number;
  disabled?: boolean;
  children?: SelectOption[];
}

export interface FieldConfig {
  /** 字段唯一 key，对应 formData 的键 */
  key: string;
  /** 字段标签 */
  label: string;
  /** 字段类型 */
  type: FieldType;
  /** 是否必填 */
  required?: boolean;
  /** 占位文本 */
  placeholder?: string;
  /** 帮助文本 */
  helpText?: string;
  /** 提示悬浮文本 */
  tooltip?: string;
  /** 最小/最大值 (number/money 类型) */
  min?: number;
  max?: number;
  /** 步长 (number/money 类型) */
  step?: number;
  /** 文本域行数 (textarea 类型) */
  rows?: number;
  /** 选项列表 (select/radio/multi-select 类型) */
  options?: SelectOption[];
  /** 异步加载选项的函数 (search-select 类型) */
  loadOptions?: (keyword: string) => Promise<SelectOption[]>;
  /** 联动：当值变化时触发其他字段的选项更新 */
  onChange?: (value: unknown, formData: Record<string, unknown>) => Record<string, SelectOption[]>;
  /** 条件显示：返回 true 时才渲染此字段 */
  visibleWhen?: (formData: Record<string, unknown>) => boolean;
  /** 禁用条件 */
  disabledWhen?: (formData: Record<string, unknown>) => boolean;
  /** 只读条件 */
  readOnlyWhen?: (formData: Record<string, unknown>) => boolean;
  /** 栅格列宽 (1-12, 默认 12 即整行) */
  colSpan?: number;
  /** 金额币种 (money 类型) */
  currency?: string;
  /** 是否支持搜索过滤 (select 类型) */
  searchable?: boolean;
  /** 允许自定义输入 (select 类型) */
  allowCustom?: boolean;
  /** 文件上传的接受类型 (file 类型) */
  accept?: string;
  /** 最大长度 (text/textarea 类型) */
  maxLength?: number;
  /** 正则校验 */
  pattern?: RegExp;
  /** 正则校验错误提示 */
  patternMessage?: string;
}

export interface FormSectionConfig {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  fields: FieldConfig[];
  /** 条件显示整个分块 */
  visibleWhen?: (formData: Record<string, unknown>) => boolean;
  /** 栅格列数 (默认 2) */
  columns?: 1 | 2 | 3 | 4;
}

// ============================================================
// 单个表单字段渲染组件
// ============================================================

interface FormFieldProps {
  config: FieldConfig;
  value: unknown;
  onChange: (key: string, value: unknown) => void;
  error?: string;
  disabled?: boolean;
  readOnly?: boolean;
  /** 联动上下文 */
  formData?: Record<string, unknown>;
}

export function FormField({ config, value, onChange, error, disabled, readOnly }: FormFieldProps) {
  const {
    key, label, type, required, placeholder, helpText, tooltip,
    min, max, step, rows = 3, options = [], searchable, maxLength,
    pattern, patternMessage, accept,
  } = config;

  const inputClasses =
    "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition disabled:bg-gray-50 disabled:text-gray-500";
  const errorClasses = "w-full px-3 py-2 border border-red-400 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none bg-red-50";

  const renderInput = () => {
    switch (type) {
      case "text":
      case "phone":
      case "email":
        return (
          <input
            type={type === "number" ? "number" : type === "email" ? "email" : "text"}
            value={(value as string) ?? ""}
            onChange={(e) => {
              let v = e.target.value;
              if (maxLength && v.length > maxLength) v = v.slice(0, maxLength);
              onChange(key, v);
            }}
            placeholder={placeholder}
            disabled={disabled}
            readOnly={readOnly}
            maxLength={maxLength}
            className={error ? errorClasses : inputClasses}
            onBlur={(e) => {
              if (pattern && e.target.value && !pattern.test(e.target.value)) {
                onChange(key, e.target.value); // keep value but show error via parent
              }
            }}
          />
        );

      case "number":
        return (
          <input
            type="number"
            value={(value as number | string) ?? ""}
            onChange={(e) => onChange(key, e.target.value === "" ? "" : Number(e.target.value))}
            placeholder={placeholder}
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            readOnly={readOnly}
            className={error ? errorClasses : inputClasses}
          />
        );

      case "money":
        return (
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">¥</span>
            <input
              type="number"
              value={(value as number | string) ?? ""}
              onChange={(e) => onChange(key, e.target.value === "" ? "" : Number(e.target.value))}
              placeholder={placeholder}
              min={min ?? 0}
              step={step ?? 0.01}
              disabled={disabled}
              readOnly={readOnly}
              className={`${error ? errorClasses : inputClasses} pl-8`}
            />
          </div>
        );

      case "textarea":
        return (
          <textarea
            value={(value as string) ?? ""}
            onChange={(e) => onChange(key, e.target.value)}
            placeholder={placeholder}
            rows={rows}
            maxLength={maxLength}
            disabled={disabled}
            readOnly={readOnly}
            className={`${error ? errorClasses : inputClasses} resize-none`}
          />
        );

      case "select":
        return (
          <select
            value={(value as string | number) ?? ""}
            onChange={(e) => onChange(key, e.target.value)}
            disabled={disabled}
            className={error ? errorClasses : inputClasses}
          >
            <option value="">{placeholder || `请选择${label}`}</option>
            {options.map((opt) => (
              opt.children ? (
                <optgroup key={opt.value} label={opt.label}>
                  {opt.children.map((child) => (
                    <option key={child.value} value={child.value} disabled={child.disabled}>
                      {child.label}
                    </option>
                  ))}
                </optgroup>
              ) : (
                <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                  {opt.label}
                </option>
              )
            ))}
          </select>
        );

      case "multi-select":
        const selectedValues: (string | number)[] = Array.isArray(value) ? value : [];
        return (
          <div className="space-y-1.5">
            <div className={`flex flex-wrap gap-1.5 p-2 border rounded-lg min-h-[38px] ${error ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}>
              {selectedValues.length === 0 && (
                <span className="text-sm text-gray-400">{placeholder || '请选择'}</span>
              )}
              {selectedValues.map((v) => {
                const opt = options.find((o) => o.value === v);
                return (
                  <span key={v} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                    {opt?.label || String(v)}
                    <button
                      type="button"
                      onClick={() => onChange(key, selectedValues.filter((x) => x !== v))}
                      className="text-blue-400 hover:text-blue-600"
                      disabled={disabled}
                    >
                      ×
                    </button>
                  </span>
                );
              })}
            </div>
            <div className="grid grid-cols-2 gap-1 max-h-32 overflow-y-auto">
              {options.map((opt) => (
                <label key={opt.value} className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer hover:text-gray-900">
                  <input
                    type="checkbox"
                    checked={selectedValues.includes(opt.value)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        onChange(key, [...selectedValues, opt.value]);
                      } else {
                        onChange(key, selectedValues.filter((x) => x !== opt.value));
                      }
                    }}
                    disabled={disabled}
                    className="w-3.5 h-3.5 text-blue-600 rounded border-gray-300"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>
        );

      case "radio":
        return (
          <div className="flex items-center gap-4 flex-wrap pt-1">
            {options.map((opt) => (
              <label key={opt.value} className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
                <input
                  type="radio"
                  name={key}
                  value={opt.value}
                  checked={value === opt.value}
                  onChange={() => onChange(key, opt.value)}
                  disabled={disabled}
                  className="w-4 h-4 text-blue-600"
                />
                {opt.label}
              </label>
            ))}
          </div>
        );

      case "checkbox":
        return (
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={!!value}
              onChange={(e) => onChange(key, e.target.checked)}
              disabled={disabled}
              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
            {options[0]?.label || label}
          </label>
        );

      case "switch":
        return (
          <button
            type="button"
            role="switch"
            aria-checked={!!value}
            onClick={() => !disabled && !readOnly && onChange(key, !value)}
            disabled={disabled || readOnly}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
              value ? "bg-blue-600" : "bg-gray-300"
            } ${disabled ? "opacity-50" : ""}`}
          >
            <span className={`inline-block h-4 w-4 rounded-full bg-white transition transform ${
              value ? "translate-x-6" : "translate-x-1"
            }`} />
          </button>
        );

      case "date":
        return (
          <input
            type="date"
            value={(value as string) ?? ""}
            onChange={(e) => onChange(key, e.target.value)}
            disabled={disabled}
            readOnly={readOnly}
            className={error ? errorClasses : inputClasses}
          />
        );

      case "datetime":
        return (
          <input
            type="datetime-local"
            value={(value as string) ?? ""}
            onChange={(e) => onChange(key, e.target.value)}
            disabled={disabled}
            readOnly={readOnly}
            className={error ? errorClasses : inputClasses}
          />
        );

      case "file":
        return (
          <input
            type="file"
            accept={accept}
            onChange={(e) => {
              const files = e.target.files;
              onChange(key, files);
            }}
            disabled={disabled}
            className={error ? errorClasses : inputClasses}
          />
        );

      case "color":
        return (
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={(value as string) ?? "#000000"}
              onChange={(e) => onChange(key, e.target.value)}
              disabled={disabled}
              className="w-10 h-10 rounded border border-gray-300 cursor-pointer"
            />
            <input
              type="text"
              value={(value as string) ?? ""}
              onChange={(e) => onChange(key, e.target.value)}
              disabled={disabled}
              className={`${inputClasses} w-32`}
            />
          </div>
        );

      default:
        return (
          <input
            type="text"
            value={(value as string) ?? ""}
            onChange={(e) => onChange(key, e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            readOnly={readOnly}
            className={error ? errorClasses : inputClasses}
          />
        );
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
        {tooltip && (
          <span className="inline-block ml-1 text-gray-400 cursor-help" title={tooltip}>ⓘ</span>
        )}
      </label>
      {renderInput()}
      {helpText && !error && (
        <p className="text-xs text-gray-400 mt-1">{helpText}</p>
      )}
      {error && (
        <p className="text-xs text-red-500 mt-1">{error}</p>
      )}
      {(maxLength && type === "textarea") && (
        <div className="text-xs text-gray-400 mt-1 text-right">
          {(value as string)?.length ?? 0}/{maxLength}
        </div>
      )}
    </div>
  );
}

// ============================================================
// 表单分区组件
// ============================================================

interface FormSectionProps {
  config: FormSectionConfig;
  formData: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
  readOnly?: boolean;
}

export function FormSection({ config, formData, onChange, errors = {}, disabled, readOnly }: FormSectionProps) {
  if (config.visibleWhen && !config.visibleWhen(formData)) return null;

  const cols = config.columns ?? 2;
  const gridClass = cols === 1
    ? "grid-cols-1"
    : cols === 2
    ? "grid-cols-2"
    : cols === 3
    ? "grid-cols-3"
    : "grid-cols-4";

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      {config.title && (
        <div className="mb-5">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            {config.icon}
            {config.title}
          </h3>
          {config.description && (
            <p className="text-sm text-gray-500 mt-1">{config.description}</p>
          )}
        </div>
      )}
      <div className={`grid ${gridClass} gap-4`}>
        {config.fields
          .filter((f) => !f.visibleWhen || f.visibleWhen(formData))
          .map((field) => {
            const isDisabled = disabled || (field.disabledWhen?.(formData) ?? false);
            const isReadOnly = readOnly || (field.readOnlyWhen?.(formData) ?? false);
            const colSpan = field.colSpan ?? 12 / cols;

            return (
              <div
                key={field.key}
                className={colSpan > 1 ? `col-span-${Math.min(colSpan, cols)}` : ""}
              >
                <FormField
                  config={field}
                  value={formData[field.key]}
                  onChange={onChange}
                  error={errors[field.key]}
                  disabled={isDisabled}
                  readOnly={isReadOnly}
                  formData={formData}
                />
              </div>
            );
          })}
      </div>
    </div>
  );
}

// ============================================================
// 动态表单组件（组合多个 FormSection）
// ============================================================

interface DynamicFormProps {
  sections: FormSectionConfig[];
  formData: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
  readOnly?: boolean;
}

export function DynamicForm({ sections, formData, onChange, errors, disabled, readOnly }: DynamicFormProps) {
  return (
    <div className="space-y-6">
      {sections
        .filter((s) => !s.visibleWhen || s.visibleWhen(formData))
        .map((section, idx) => (
          <FormSection
            key={section.title || idx}
            config={section}
            formData={formData}
            onChange={onChange}
            errors={errors}
            disabled={disabled}
            readOnly={readOnly}
          />
        ))}
    </div>
  );
}
