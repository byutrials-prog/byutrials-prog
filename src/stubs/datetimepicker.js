// Web stub untuk @react-native-community/datetimepicker
// Paket ini native-only, di web kita gunakan HTML <input type="date">
import React from 'react';

export default function DateTimePicker({ value, onChange, mode = 'date', style, ...props }) {
  const handleChange = (e) => {
    if (onChange) {
      const newDate = new Date(e.target.value);
      if (!isNaN(newDate)) {
        onChange({ type: 'set', nativeEvent: { timestamp: newDate.getTime() } }, newDate);
      }
    }
  };

  const inputType = mode === 'time' ? 'time' : mode === 'datetime' ? 'datetime-local' : 'date';
  const inputValue = value instanceof Date && !isNaN(value)
    ? mode === 'time'
      ? value.toTimeString().slice(0, 5)
      : mode === 'datetime'
      ? value.toISOString().slice(0, 16)
      : value.toISOString().split('T')[0]
    : '';

  return React.createElement('input', {
    type: inputType,
    value: inputValue,
    onChange: handleChange,
    style: {
      backgroundColor: 'transparent',
      border: 'none',
      color: 'inherit',
      fontSize: 'inherit',
      ...style,
    },
    ...props,
  });
}

// Named exports yang mungkin dipakai
export const IOSNativeProps = {};
export const AndroidNativeProps = {};
export const DateTimePickerAndroid = {
  open: () => {},
  dismiss: () => {},
};
