'use client'

import { getModifierGroupsForProduct } from '@/lib/pos-modifiers'

type PosProduct = {
  productId: string
  name: string
  priceUgx: number
  section?: string | null
}

type Props = {
  product: PosProduct
  modifierSelections: Record<string, string>
  onSelectionChange: (group: string, option: string) => void
  onCancel: () => void
  onConfirm: () => void
  addingItem: boolean
}

export function ModifierModal({
  product,
  modifierSelections,
  onSelectionChange,
  onCancel,
  onConfirm,
  addingItem,
}: Props) {
  const groups = getModifierGroupsForProduct(product.section ?? null)
  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modifier-title"
    >
      <div className="pos-card max-w-md w-full p-6">
        <h2 id="modifier-title" className="pos-section-title text-lg mb-4">
          {product.name}
        </h2>
        {groups.map((group) => (
          <div key={group.name} className="mb-4">
            <label className="pos-label block mb-2">{group.name}</label>
            <div className="flex flex-wrap gap-2">
              {group.options.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => onSelectionChange(group.name, opt)}
                  className={`btn py-2 px-3 text-sm ${modifierSelections[group.name] === opt ? 'btn-primary' : 'btn-outline'}`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        ))}
        <div className="flex gap-3 mt-6">
          <button type="button" onClick={onCancel} className="btn btn-outline flex-1">
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={addingItem}
            className="btn btn-primary flex-1 disabled:opacity-60"
          >
            {addingItem ? 'Adding…' : 'Add to Order'}
          </button>
        </div>
      </div>
    </div>
  )
}
