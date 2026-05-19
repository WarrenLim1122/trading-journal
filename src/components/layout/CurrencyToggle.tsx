import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { useCurrency, CURRENCIES } from "../../contexts/CurrencyContext";

export function CurrencyToggle() {
  const { currency, setCurrency, symbol } = useCurrency();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="font-mono h-9 gap-1.5 shrink-0"
          />
        }
      >
        <span className="tabular-nums">{symbol}</span>
        <span className="text-muted-foreground">{currency}</span>
        <ChevronDown size={14} />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="bg-background border-border min-w-[140px]"
      >
        {CURRENCIES.map((c) => (
          <DropdownMenuItem
            key={c.code}
            onClick={() => setCurrency(c.code)}
            className={`font-mono cursor-pointer ${
              c.code === currency ? "text-primary" : ""
            }`}
          >
            <span className="w-8 tabular-nums">{c.symbol}</span>
            {c.code}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
