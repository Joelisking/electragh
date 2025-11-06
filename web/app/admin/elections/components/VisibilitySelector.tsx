import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface VisibilitySelectorProps {
  value: string;
  onChange: (value: string) => Promise<void>;
}

export function VisibilitySelector({ value, onChange }: VisibilitySelectorProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="RESTRICTED">EC Only</SelectItem>
        <SelectItem value="PUBLIC">Public</SelectItem>
        <SelectItem value="LIVE_PUBLIC">Live Public</SelectItem>
      </SelectContent>
    </Select>
  );
}
