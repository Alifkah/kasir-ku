'use client';

import { useState, useEffect } from 'react';
import { Product, ProductVariant, ProductModifier } from '@/types/pos';
import { formatIDR } from '@/data/mockData';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ShoppingCart, Plus, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VariantModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  onConfirm: (variant?: ProductVariant, modifiers?: ProductModifier[]) => void;
  initialVariant?: ProductVariant;
  initialModifiers?: ProductModifier[];
}

export default function VariantModal({ isOpen, onOpenChange, product, onConfirm, initialVariant, initialModifiers }: VariantModalProps) {
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | undefined>(undefined);
  const [selectedModifiers, setSelectedModifiers] = useState<ProductModifier[]>([]);

  // Initialize selections when product opens
  useEffect(() => {
    if (product) {
      if (initialVariant) {
        setSelectedVariant(initialVariant);
      } else if (product.variants && product.variants.length > 0) {
        setSelectedVariant(product.variants[0]);
      } else {
        setSelectedVariant(undefined);
      }
      setSelectedModifiers(initialModifiers || []);
    }
  }, [product, isOpen, initialVariant, initialModifiers]);

  if (!product) return null;

  const basePrice = product.sellingPrice;
  const varPriceDiff = selectedVariant?.priceDifference || 0;
  const modsPriceSum = selectedModifiers.reduce((acc, m) => acc + m.price, 0);
  const totalPrice = basePrice + varPriceDiff + modsPriceSum;

  const handleToggleModifier = (modifier: ProductModifier) => {
    setSelectedModifiers((prev) =>
      prev.some((m) => m.id === modifier.id)
        ? prev.filter((m) => m.id !== modifier.id)
        : [...prev, modifier]
    );
  };

  const handleAdd = () => {
    onConfirm(selectedVariant, selectedModifiers);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-border/60">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-foreground">
            Kustomisasi Pesanan
          </DialogTitle>
          <p className="text-sm font-semibold text-primary mt-1">{product.name}</p>
          <p className="text-xs text-muted-foreground">Pilih variasi rasa, ukuran, atau topping tambahan.</p>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Variants section (Radio options) */}
          {product.variants && product.variants.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Pilih Ukuran / Varian
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {product.variants.map((v) => {
                  const isSelected = selectedVariant?.id === v.id;
                  return (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVariant(v)}
                      className={cn(
                        'flex items-center justify-between p-3 rounded-lg border text-xs font-medium transition-all duration-150 cursor-pointer',
                        isSelected
                          ? 'border-primary bg-primary/10 text-primary shadow-sm'
                          : 'border-border/60 hover:border-border text-muted-foreground'
                      )}
                    >
                      <span>{v.name}</span>
                      <span className="font-semibold text-foreground">
                        {v.priceDifference === 0 
                          ? 'Default' 
                          : v.priceDifference > 0 
                            ? `+${formatIDR(v.priceDifference)}`
                            : `-${formatIDR(Math.abs(v.priceDifference))}`
                        }
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Modifiers section (Checkbox options) */}
          {product.modifiers && product.modifiers.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Topping / Modifikator Tambahan (Bisa Pilih Banyak)
              </Label>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {product.modifiers.map((m) => {
                  const isSelected = selectedModifiers.some((mod) => mod.id === m.id);
                  return (
                    <button
                      key={m.id}
                      onClick={() => handleToggleModifier(m)}
                      className={cn(
                        'w-full flex items-center justify-between p-3 rounded-lg border text-xs font-medium transition-all duration-150 cursor-pointer',
                        isSelected
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border/60 hover:border-border text-muted-foreground'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          'w-4 h-4 rounded border flex items-center justify-center transition-colors',
                          isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/50'
                        )}>
                          {isSelected && <Check size={10} className="text-white font-bold" />}
                        </div>
                        <span>{m.name}</span>
                      </div>
                      <span className="font-semibold text-foreground">+{formatIDR(m.price)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pricing Summary & Confirm button */}
          <div className="pt-4 border-t border-border/40 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Harga Terkustomisasi</p>
                <p className="text-xl font-black text-primary mt-0.5">{formatIDR(totalPrice)}</p>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <p>Harga Dasar: {formatIDR(basePrice)}</p>
                {varPriceDiff > 0 && <p>Tambahan Varian: +{formatIDR(varPriceDiff)}</p>}
                {modsPriceSum > 0 && <p>Tambahan Mod: +{formatIDR(modsPriceSum)}</p>}
              </div>
            </div>

            <button
              onClick={handleAdd}
              className="w-full py-3 rounded-xl bg-success hover:bg-success/90 text-white font-bold text-sm transition-all duration-200 glow-emerald shadow-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              <ShoppingCart size={15} />
              Tambahkan ke Keranjang
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
