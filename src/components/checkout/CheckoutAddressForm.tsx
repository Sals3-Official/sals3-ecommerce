'use client';

import type { CheckoutAddress } from '@/lib/checkout/schema';

export type CheckoutAddressErrors = Partial<
  Record<keyof CheckoutAddress, string>
>;

const COUNTRY_ERROR_ID = 'checkout-country-error';

type CheckoutAddressFormProps = {
  value: CheckoutAddress;
  errors: CheckoutAddressErrors;
  disabled: boolean;
  onChange: (field: keyof CheckoutAddress, value: string) => void;
};

function fieldId(field: keyof CheckoutAddress): string {
  return `checkout-${field}`;
}

function errorId(field: keyof CheckoutAddress): string {
  return `${fieldId(field)}-error`;
}

type FieldProps = {
  label: string;
  field: keyof CheckoutAddress;
  value: string;
  error?: string;
  disabled: boolean;
  autoComplete: string;
  inputMode?: 'email' | 'tel' | 'text' | 'numeric';
  onChange: (field: keyof CheckoutAddress, value: string) => void;
};

function Field({
  label,
  field,
  value,
  error,
  disabled,
  autoComplete,
  inputMode = 'text',
  onChange,
}: FieldProps) {
  return (
    <div>
      <label
        htmlFor={fieldId(field)}
        className="text-sm font-semibold text-ink"
      >
        {label}
      </label>
      <input
        id={fieldId(field)}
        name={field}
        value={value}
        disabled={disabled}
        autoComplete={autoComplete}
        inputMode={inputMode}
        aria-invalid={error === undefined ? undefined : true}
        aria-describedby={error === undefined ? undefined : errorId(field)}
        onChange={(event) => onChange(field, event.target.value)}
        className="mt-1 min-h-11 w-full rounded-lg border border-border-strong bg-white px-3 text-sm text-ink transition-colors duration-200 focus:border-brand-600 disabled:bg-surface-sunken disabled:text-ink-faint"
      />
      {error === undefined ? null : (
        <p
          id={errorId(field)}
          role="alert"
          className="mt-1 text-xs text-red-600"
        >
          {error}
        </p>
      )}
    </div>
  );
}

export default function CheckoutAddressForm({
  value,
  errors,
  disabled,
  onChange,
}: CheckoutAddressFormProps) {
  return (
    <section
      aria-labelledby="checkout-address-heading"
      className="rounded-xl border border-border bg-white p-4"
    >
      <h2
        id="checkout-address-heading"
        className="font-display text-xl font-semibold"
      >
        Delivery address
      </h2>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          label="Email"
          field="email"
          value={value.email}
          error={errors.email}
          disabled={disabled}
          autoComplete="email"
          inputMode="email"
          onChange={onChange}
        />
        <Field
          label="Full name"
          field="fullName"
          value={value.fullName}
          error={errors.fullName}
          disabled={disabled}
          autoComplete="name"
          onChange={onChange}
        />
        <Field
          label="Phone"
          field="phone"
          value={value.phone ?? ''}
          error={errors.phone}
          disabled={disabled}
          autoComplete="tel"
          inputMode="tel"
          onChange={onChange}
        />
        <div>
          <span
            id="checkout-country-label"
            className="text-sm font-semibold text-ink"
          >
            Country
          </span>
          <select
            id="checkout-country"
            name="country"
            value={value.country}
            disabled={disabled}
            autoComplete="country"
            aria-labelledby="checkout-country-label"
            aria-invalid={errors.country === undefined ? undefined : true}
            aria-describedby={
              errors.country === undefined ? undefined : COUNTRY_ERROR_ID
            }
            onChange={(event) => onChange('country', event.target.value)}
            className="mt-1 min-h-11 w-full rounded-lg border border-border-strong bg-white px-3 text-sm text-ink transition-colors duration-200 focus:border-brand-600 disabled:bg-surface-sunken disabled:text-ink-faint"
          >
            <option value="AU">Australia</option>
            <option value="PH">Philippines</option>
          </select>
          {errors.country === undefined ? null : (
            <p
              id={COUNTRY_ERROR_ID}
              role="alert"
              className="mt-1 text-xs text-red-600"
            >
              {errors.country}
            </p>
          )}
        </div>
        <div className="sm:col-span-2">
          <Field
            label="Address line 1"
            field="addressLine1"
            value={value.addressLine1}
            error={errors.addressLine1}
            disabled={disabled}
            autoComplete="address-line1"
            onChange={onChange}
          />
        </div>
        <div className="sm:col-span-2">
          <Field
            label="Address line 2"
            field="addressLine2"
            value={value.addressLine2 ?? ''}
            error={errors.addressLine2}
            disabled={disabled}
            autoComplete="address-line2"
            onChange={onChange}
          />
        </div>
        <Field
          label="City"
          field="city"
          value={value.city}
          error={errors.city}
          disabled={disabled}
          autoComplete="address-level2"
          onChange={onChange}
        />
        <Field
          label="State or region"
          field="region"
          value={value.region}
          error={errors.region}
          disabled={disabled}
          autoComplete="address-level1"
          onChange={onChange}
        />
        <Field
          label="Postal code"
          field="postalCode"
          value={value.postalCode}
          error={errors.postalCode}
          disabled={disabled}
          autoComplete="postal-code"
          inputMode="text"
          onChange={onChange}
        />
      </div>
    </section>
  );
}
