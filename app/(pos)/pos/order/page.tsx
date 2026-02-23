'use client'

import { Fragment, useEffect, useState, useCallback, useRef, useMemo, memo } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { getStaffId, posFetch } from '@/lib/pos-client'
import { getShiftId } from '@/lib/pos-shift-store'
import { isOnline } from '@/lib/offline/connection'
import {
  createOrderOffline,
  addItemOffline,
  updateOrderStatusOffline,
  getOrderDetailOfflineFormatted,
} from '@/lib/offline/offline-order-service'
import { PosNavHeader } from '@/components/pos/PosNavHeader'
import { ErrorBanner } from '@/components/pos/ErrorBanner'
import { SkeletonLoader } from '@/components/ui/SkeletonLoader'
import { EmptyState } from '@/components/ui/EmptyState'
import { ShoppingCart, Package, Search, X } from 'lucide-react'
import { IconSoup, IconSoupFilled, IconGlass, IconGlassFilled } from '@tabler/icons-react'
import { getModifierGroupsForProduct } from '@/lib/pos-modifiers'

const OrderNameModal = dynamic(
  () => import('@/components/pos/OrderNameModal').then((m) => ({ default: m.OrderNameModal })),
  { ssr: false }
)

const PreparationNotesModal = dynamic(
  () => import('@/components/pos/PreparationNotesModal').then((m) => ({ default: m.PreparationNotesModal })),
  { ssr: false }
)

const ModifierModal = dynamic(
  () => import('@/components/pos/ModifierModal').then((m) => ({ default: m.ModifierModal })),
  { ssr: false }
)

type PosProduct = {
  productId: string
  name: string
  priceUgx: number
  category?: string | null
  section?: string | null
  images?: string[]
  sizes?: string[]
  isHappyHour?: boolean
}

type OrderItem = {
  id: string
  productId: string
  productName: string
  category?: string | null
  imageUrl?: string | null
  quantity: number
  size?: string | null
  modifier?: string | null
  notes?: string | null
  subtotalUgx?: number
  lineTotalUgx?: number
}

type OrderDetail = {
  orderId: string
  orderNumber: string
  status: string
  totalUgx: number
  items: OrderItem[]
  orderType?: 'takeaway' | 'dine_in'
  tableId?: string | null
  tableCode?: string | null
  sentToKitchenAt?: string | null
  sentToBarAt?: string | null
  preparationNotes?: string | null
}

type TableStatus = {
  tableId: string
  tableCode: string
  capacity?: number | null
  activeOrderCount?: number
  hasActiveOrder: boolean
  isFull?: boolean
  orderId: string | null
  orderNumber: string | null
}

const FOOD_SECTIONS = [
  'Breakfast',
  'Starters',
  'Chicken Dishes',
  'Soups',
  'Salads & Sandwiches',
  'Burgers',
  'Pasta',
  'Main Dishes',
  "Weekend Chef's Platters",
  'Weekend Burger Offers',
  'Desserts',
  'Spicy / Specialty Dishes',
]

const DRINK_TIERS = ['Alcoholic', 'Non-Alcoholic'] as const
const ALCOHOLIC_SECTIONS = ['Beers', 'Wines', 'Spirits', 'Champagnes', 'Cocktails', 'Pitchers']
const NON_ALCOHOLIC_SECTIONS = ['Tea & Coffee', 'Fresh Juices', 'Milkshakes', 'Smoothies', 'Mocktails', 'Sodas', 'Water']

function generateOrderNumber() {
  return `ORD-${Date.now()}`
}

const PLACEHOLDER_IMAGE = '/pos-images/placeholder.svg'

/** Deterministic index from string — gives variety per section without flickering */
function pickHeroIndex(label: string, count: number) {
  if (count <= 1) return 0
  const hash = label.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return Math.abs(hash) % count
}

const ProductImage = memo(function ProductImage({ product }: { product: PosProduct }) {
  const src = product.images?.[0]
  const useSrc = src && (src.startsWith('http') || src.startsWith('/')) ? src : PLACEHOLDER_IMAGE
  return (
    <div className="w-full aspect-square relative rounded-lg overflow-hidden bg-neutral-100 dark:bg-neutral-800">
      <Image src={useSrc} alt={product.name} fill className="object-cover" sizes="(max-width: 768px) 50vw, 25vw" />
    </div>
  )
})

export default function PosOrdersPage() {
  const router = useRouter()
  const [staffOk, setStaffOk] = useState(false)
  const [products, setProducts] = useState<PosProduct[]>([])
  const [popularProducts, setPopularProducts] = useState<PosProduct[]>([])
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [viewMode, setViewMode] = useState<'popular' | 'food' | 'drinks'>('popular')
  const [selectedDrinkTier, setSelectedDrinkTier] = useState<'Alcoholic' | 'Non-Alcoholic' | null>(null)
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const searchWrapperRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [addingItem, setAddingItem] = useState(false)
  const [removingItemId, setRemovingItemId] = useState<string | null>(null)
  const [removedForUndo, setRemovedForUndo] = useState<{ productId: string; productName: string; quantity: number; size?: string | null; modifier?: string | null; notes?: string | null } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modifierProduct, setModifierProduct] = useState<PosProduct | null>(null)
  const [modifierSelections, setModifierSelections] = useState<Record<string, string>>({})
  const [orderType, setOrderType] = useState<'takeaway' | 'dine_in' | null>(null)
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null)
  const [preparationNotesModalOpen, setPreparationNotesModalOpen] = useState(false)
  const [pendingSendDestination, setPendingSendDestination] = useState<'kitchen' | 'bar' | null>(null)
  const [mixedOrderPopupOpen, setMixedOrderPopupOpen] = useState(false)
  const [tables, setTables] = useState<TableStatus[]>([])
  const [tableSearchQuery, setTableSearchQuery] = useState('')
  const [tableSearchFocused, setTableSearchFocused] = useState(false)
  const tableSearchWrapperRef = useRef<HTMLDivElement>(null)
  const [orderNameModalOpen, setOrderNameModalOpen] = useState(false)
  const pendingOrderNameAction = useRef<'new' | { product: PosProduct; size?: string | null; modifier?: string | null } | null>(null)
  const tableSearchInputRef = useRef<HTMLInputElement>(null)
  const [serviceTypeDropdownOpen, setServiceTypeDropdownOpen] = useState(false)
  const serviceTypeSelectRef = useRef<HTMLSelectElement>(null)
  const serviceTypeJustClicked = useRef(false)
  /** Ref for current order id so doAddProduct works even before React commits setOrder (avoids opening dialog right after create) */
  const currentOrderIdRef = useRef<string | null>(null)
  /** Display name for current order (e.g. name typed in dialog); cleared when order is cleared */
  const [currentOrderDisplayName, setCurrentOrderDisplayName] = useState('')

  const shiftId = getShiftId()

  function normaliseOrderFromApi(data: unknown): OrderDetail {
    const d = data as Record<string, unknown>
    const items = (Array.isArray(d?.items) ? d.items : []) as OrderItem[]
    return {
      orderId: String(d?.orderId ?? d?.id ?? ''),
      orderNumber: String(d?.orderNumber ?? ''),
      status: String(d?.status ?? 'pending'),
      totalUgx: Number(d?.totalUgx ?? 0),
      items: items.map((it: Record<string, unknown>) => ({
        id: String(it.id),
        productId: String(it.productId),
        productName: String(it.productName ?? it.productId),
        category: it.category != null ? String(it.category) : undefined,
        imageUrl: it.imageUrl != null ? String(it.imageUrl) : undefined,
        quantity: Number(it.quantity ?? 1),
        size: it.size != null ? String(it.size) : null,
        modifier: it.modifier != null ? String(it.modifier) : null,
        notes: it.notes != null ? String(it.notes) : null,
        subtotalUgx: Number(it.subtotalUgx ?? it.lineTotalUgx ?? 0),
        lineTotalUgx: Number(it.subtotalUgx ?? it.lineTotalUgx ?? 0),
      })),
      orderType: d?.orderType === 'dine_in' ? 'dine_in' : 'takeaway',
      tableId: d?.tableId != null ? String(d.tableId) : null,
      tableCode: d?.tableCode != null ? String(d.tableCode) : null,
      sentToKitchenAt: d?.sentToKitchenAt != null ? String(d.sentToKitchenAt) : undefined,
      sentToBarAt: d?.sentToBarAt != null ? String(d.sentToBarAt) : undefined,
      preparationNotes: d?.preparationNotes != null ? String(d.preparationNotes) : undefined,
    }
  }

  const fetchProducts = useCallback(async () => {
    try {
      const res = await posFetch('/api/pos/products')
      const data = await res.json().catch(() => [])
      if (res.ok && Array.isArray(data)) {
        setProducts(data)
      } else {
        setProducts([])
      }
    } catch {
      setProducts([])
    }
  }, [])

  const fetchPopularProducts = useCallback(async () => {
    if (!shiftId) return
    try {
      const res = await posFetch(`/api/pos/products/most-popular?shiftId=${encodeURIComponent(shiftId)}`)
      if (res.ok) setPopularProducts(await res.json())
      else setPopularProducts([])
    } catch {
      setPopularProducts([])
    }
  }, [shiftId])


  const fetchOrder = useCallback(async (orderId: string) => {
    try {
      if (!isOnline()) {
        const detail = await getOrderDetailOfflineFormatted(orderId)
        if (detail) {
          currentOrderIdRef.current = detail.orderId
          const orderDetail: OrderDetail = {
            ...detail,
            orderType: detail.orderType === 'dine_in' ? 'dine_in' : 'takeaway',
          }
          setOrder(orderDetail)
          setOrderType(detail.orderType === 'dine_in' ? 'dine_in' : detail.orderType === 'takeaway' ? 'takeaway' : null)
          setSelectedTableId(detail.tableId ?? null)
          setCurrentOrderDisplayName('')
        } else {
          currentOrderIdRef.current = null
          setOrder(null)
          setCurrentOrderDisplayName('')
        }
        return
      }
      const res = await posFetch(`/api/orders/${orderId}`)
      if (res.ok) {
        const data = await res.json()
        const norm = normaliseOrderFromApi(data)
        currentOrderIdRef.current = norm.orderId
        setOrder(norm)
        if (data.orderType) setOrderType(data.orderType)
        else setOrderType(null)
        if (data.tableId) setSelectedTableId(data.tableId)
        else setSelectedTableId(null)
        setCurrentOrderDisplayName('')
      } else {
        currentOrderIdRef.current = null
        setOrder(null)
        setCurrentOrderDisplayName('')
      }
    } catch {
      currentOrderIdRef.current = null
      setOrder(null)
      setCurrentOrderDisplayName('')
    }
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target as Node)) {
        setSearchFocused(false)
      }
      if (tableSearchWrapperRef.current && !tableSearchWrapperRef.current.contains(e.target as Node)) {
        setTableSearchFocused(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function fetchTables() {
    if (!shiftId) {
      setTables([])
      return
    }
    try {
      const res = await posFetch(`/api/pos/tables?shiftId=${encodeURIComponent(shiftId)}`)
      if (!res.ok) throw new Error('Failed to load tables')
      const data = await res.json()
      setTables(data)
    } catch (e) {
      setTables([])
    }
  }

  useEffect(() => {
    if (shiftId) fetchTables()
    else setTables([])
  }, [shiftId])

  useEffect(() => {
    if (!getStaffId()) {
      router.replace('/pos/login')
      return
    }
    if (!shiftId) {
      router.replace('/pos/start')
      return
    }
    setStaffOk(true)
  }, [router, shiftId])

  useEffect(() => {
    if (!staffOk) return
    setLoading(true)
    Promise.all([fetchProducts(), fetchPopularProducts()]).finally(() => setLoading(false))
  }, [staffOk, fetchProducts, fetchPopularProducts])

  function openNewOrderModal() {
    pendingOrderNameAction.current = 'new'
    setOrderNameModalOpen(true)
  }

  async function handleOrderNameConfirm(orderName: string) {
    const staffId = getStaffId()
    if (!staffId) return
    const action = pendingOrderNameAction.current
    pendingOrderNameAction.current = null
    setOrderNameModalOpen(false)

    setCreating(true)
    setError(null)
    setCurrentOrderDisplayName(orderName)
    try {
      if (!isOnline()) {
        const o = await createOrderOffline(
          orderType === 'dine_in' && selectedTableId
            ? { orderType: 'dine_in', tableId: selectedTableId, orderNumber: orderName || undefined }
            : { orderType: 'takeaway', orderNumber: orderName }
        )
        const detail = await getOrderDetailOfflineFormatted(o.localId)
        if (detail) setOrder(detail)
        if (orderType !== 'dine_in' || !selectedTableId) {
          setSelectedTableId(null)
        }
        if (action && action !== 'new' && 'product' in action) {
          setAddingItem(true)
          try {
            await addItemOffline({
              orderLocalId: o.localId,
              productId: action.product.productId,
              productName: action.product.name,
              quantity: 1,
              unitPriceUgx: action.product.priceUgx,
              size: action.size ?? null,
              modifier: action.modifier ?? null,
            })
            const updated = await getOrderDetailOfflineFormatted(o.localId)
            if (updated) setOrder(updated)
            setModifierProduct(null)
            setModifierSelections({})
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to add item')
          } finally {
            setAddingItem(false)
          }
        }
        setCreating(false)
        return
      }

      const res = await posFetch('/api/orders/takeaway', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffId, orderNumber: orderName }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to create order')
      }
      const data = await res.json()
      const orderIdFromApi = String(data.orderId ?? data.id ?? '')
      const displayOrderNumber = (data as Record<string, unknown>).displayOrderNumber ?? data.orderNumber ?? ''

      if (action && action !== 'new' && 'product' in action) {
        const orderIdStr = orderIdFromApi
        currentOrderIdRef.current = orderIdStr
        const priceUgx = Number(action.product.priceUgx ?? 0)
        const optimisticItem: OrderItem = {
          id: `temp-${orderIdStr}`,
          productId: action.product.productId,
          productName: action.product.name,
          category: action.product.category ?? null,
          imageUrl: action.product.images?.[0] ?? null,
          quantity: 1,
          size: action.size ?? null,
          modifier: action.modifier ?? null,
          notes: null,
          subtotalUgx: priceUgx,
          lineTotalUgx: priceUgx,
        }
        const optimisticOrder: OrderDetail = {
          orderId: orderIdStr,
          orderNumber: orderName?.trim() ? orderName.trim() : String((data as Record<string, unknown>).displayOrderNumber ?? data.orderNumber ?? ''),
          status: (data as { status?: string }).status ?? 'pending',
          totalUgx: priceUgx,
          items: [optimisticItem],
          tableId: null,
          tableCode: null,
        }
        setOrder(optimisticOrder)
        setOrderType(null)
        setCreating(false)
        setAddingItem(true)
        try {
          const addRes = await posFetch(`/api/orders/${orderIdStr}/items`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              productId: action.product.productId,
              quantity: 1,
              size: action.size ?? undefined,
              modifier: action.modifier ?? undefined,
            }),
          })
          if (!addRes.ok) throw new Error('Failed to add item')
          const addData = (await addRes.json().catch(() => ({}))) as Record<string, unknown>
          const normalised = normaliseOrderFromApi(addData)
          if (normalised.items.length > 0) {
            setOrder({
              ...normalised,
              orderId: normalised.orderId || orderIdStr,
              orderNumber: orderName?.trim() ? orderName.trim() : normalised.orderNumber,
              orderType: undefined,
            })
          }
          setOrderType(null)
          setModifierProduct(null)
          setModifierSelections({})
          if (shiftId) fetchPopularProducts()
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Failed to add item')
        } finally {
          setAddingItem(false)
        }
      } else {
        currentOrderIdRef.current = orderIdFromApi
        setOrder({
          orderId: orderIdFromApi,
          orderNumber: orderName?.trim() ? orderName.trim() : String(displayOrderNumber),
          status: data.status ?? 'pending',
          totalUgx: data.totalUgx ?? 0,
          items: [],
          tableId: null,
          tableCode: null,
        })
        setOrderType(null)
      }
      setSelectedTableId(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create order')
    } finally {
      setCreating(false)
    }
  }

  async function doAddProduct(product: PosProduct, size?: string | null, modifier?: string | null) {
    const effectiveOrderId = order?.orderId ?? currentOrderIdRef.current
    if (!effectiveOrderId) {
      pendingOrderNameAction.current = { product, size, modifier }
      setOrderNameModalOpen(true)
      return
    }

    const orderId = effectiveOrderId
    setAddingItem(true)
    try {
      if (!isOnline()) {
        await addItemOffline({
          orderLocalId: orderId,
          productId: product.productId,
          productName: product.name,
          quantity: 1,
          unitPriceUgx: product.priceUgx,
          size: size ?? null,
          modifier: modifier ?? null,
        })
        const detail = await getOrderDetailOfflineFormatted(orderId)
        if (detail) setOrder(detail)
        setModifierProduct(null)
        setModifierSelections({})
        setAddingItem(false)
        return
      }

      const res = await posFetch(`/api/orders/${orderId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.productId,
          quantity: 1,
          size: size ?? undefined,
          modifier: modifier ?? undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to add item')
      }
      const safeOrderId = orderId
      currentOrderIdRef.current = safeOrderId
      // Use add-item response (full order with new item) so the product appears instantly
      const addData = (await res.json().catch(() => ({}))) as Record<string, unknown>
      const dataForOrder =
        addData && typeof addData.orderId === 'string' && Array.isArray(addData.items)
          ? addData
          : (await (async () => {
              const getRes = await posFetch(`/api/orders/${orderId}`)
              if (getRes.ok) {
                return (await getRes.json().catch(() => ({}))) as Record<string, unknown>
              }
              return addData
            })())
      const normalised = normaliseOrderFromApi(dataForOrder)
      const displayNumber = (order?.orderNumber || currentOrderDisplayName) && !normalised.orderNumber ? (order?.orderNumber || currentOrderDisplayName) : normalised.orderNumber
      setOrder({
        ...normalised,
        orderId: normalised.orderId || safeOrderId,
        orderNumber: displayNumber ?? normalised.orderNumber,
      })
      const ot = dataForOrder?.orderType
      if (ot === 'dine_in' || ot === 'takeaway') {
        setOrderType(ot)
        if (ot === 'dine_in' && dataForOrder?.tableId) {
          setSelectedTableId(String(dataForOrder.tableId))
        }
        if (ot === 'takeaway') setSelectedTableId(null)
      }
      setModifierProduct(null)
      setModifierSelections({})
      if (shiftId) fetchPopularProducts()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add item')
    } finally {
      setAddingItem(false)
    }
  }

  function handleProductClick(product: PosProduct) {
    const groups = getModifierGroupsForProduct(product.section ?? null)
    if (groups.length > 0) {
      setModifierProduct(product)
      const initial: Record<string, string> = {}
      groups.forEach((g) => {
        initial[g.name] = g.options[0] ?? ''
      })
      setModifierSelections(initial)
    } else {
      doAddProduct(product)
    }
  }

  function handleModifierConfirm() {
    if (!modifierProduct) return
    const parts: string[] = []
    Object.entries(modifierSelections).forEach(([, v]) => {
      if (v) parts.push(v)
    })
    const modifierStr = parts.join(', ')
    const sizePart = modifierSelections['Size'] ?? modifierSelections['size']
    doAddProduct(modifierProduct, sizePart || undefined, modifierStr || undefined)
  }

  async function handleQuantityChange(itemId: string, delta: number) {
    if (!order) return
    const items = order.items ?? []
    const item = items.find((i) => i.id === itemId)
    if (!item) return
    const newQty = item.quantity + delta
    if (newQty < 1) return
    try {
      const res = await posFetch(`/api/order-items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: newQty }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to update')
      }
      const getRes = await posFetch(`/api/orders/${order.orderId}`)
      if (getRes.ok) {
        const getData = await getRes.json()
        const normalised = normaliseOrderFromApi(getData)
        setOrder({ ...normalised, orderId: normalised.orderId || order.orderId })
      } else {
        const data = await res.json()
        setOrder({ ...normaliseOrderFromApi(data), orderId: order.orderId })
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update quantity')
    }
  }

  async function handleRemoveItem(item: OrderItem) {
    if (!order) return
    setRemovingItemId(item.id)
    setRemovedForUndo(null)
    setError(null)
    try {
      const res = await posFetch(`/api/order-items/${item.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to remove')
      }
      const getRes = await posFetch(`/api/orders/${order.orderId}`)
      if (getRes.ok) {
        const getData = await getRes.json()
        const normalised = normaliseOrderFromApi(getData)
        setOrder({ ...normalised, orderId: normalised.orderId || order.orderId })
      } else {
        const data = await res.json()
        setOrder({ ...normaliseOrderFromApi(data), orderId: order.orderId })
      }
      setRemovedForUndo({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        size: item.size ?? null,
        modifier: item.modifier ?? null,
        notes: item.notes ?? null,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to remove item')
    } finally {
      setRemovingItemId(null)
    }
  }

  async function handleUndoRemove() {
    if (!order || !removedForUndo) return
    const toRestore = removedForUndo
    setRemovedForUndo(null)
    setAddingItem(true)
    setError(null)
    try {
      const res = await posFetch(`/api/orders/${order.orderId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: toRestore.productId,
          quantity: toRestore.quantity,
          size: toRestore.size,
          modifier: toRestore.modifier,
          notes: toRestore.notes,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to restore')
      }
      const getRes = await posFetch(`/api/orders/${order.orderId}`)
      if (getRes.ok) {
        const getData = await getRes.json()
        const normalised = normaliseOrderFromApi(getData)
        setOrder({ ...normalised, orderId: normalised.orderId || order.orderId })
      } else {
        const data = await res.json()
        setOrder({ ...normaliseOrderFromApi(data), orderId: order.orderId })
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to restore item')
    } finally {
      setAddingItem(false)
    }
  }

  const orderHasFood = (order?.items ?? []).some((it) => (it as OrderItem).category === 'Food')
  const orderHasDrinks = (order?.items ?? []).some((it) => (it as OrderItem).category === 'Drinks')
  const orderHasBoth = orderHasFood && orderHasDrinks
  const orderSent = !!(order?.sentToKitchenAt || order?.sentToBarAt)

  function handleSendToKitchenOrBarClick() {
    if (!order || (order?.items ?? []).length === 0) return
    if (orderHasBoth) {
      setMixedOrderPopupOpen(true)
      return
    }
    if (orderHasDrinks && !orderHasFood) {
      setPendingSendDestination('bar')
      setPreparationNotesModalOpen(true)
      return
    }
    setPendingSendDestination('kitchen')
    setPreparationNotesModalOpen(true)
  }

  async function doSendToKitchenOrBar(destination: 'kitchen' | 'bar', preparationNotes: string) {
    if (!order || order.status !== 'pending') return
    const items = order.items ?? []
    if (items.length === 0) {
      setError(`Add items before sending to ${destination === 'bar' ? 'bar' : 'kitchen'}`)
      return
    }
    if (!orderType) {
      setError('Please select service type (Takeaway or Dine In)')
      return
    }
    if (orderType === 'dine_in' && !selectedTableId) {
      setError('Please select a table for dine-in order')
      return
    }
    setSubmitting(true)
    setError(null)
    setPreparationNotesModalOpen(false)
    setPendingSendDestination(null)
    try {
      if (!isOnline()) {
        await updateOrderStatusOffline({ orderLocalId: order.orderId, newStatus: 'preparing' })
        const detail = await getOrderDetailOfflineFormatted(order.orderId)
        if (detail) setOrder(detail)
        setSubmitting(false)
        return
      }
      const res = await posFetch(`/api/orders/${order.orderId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updatedByStaffId: getStaffId(),
          orderType: orderType ?? undefined,
          tableId: orderType === 'dine_in' && selectedTableId ? selectedTableId : undefined,
          destination,
          preparationNotes: preparationNotes || undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to send')
      }
      currentOrderIdRef.current = null
      setOrder(null)
      setOrderType(null)
      setSelectedTableId(null)
      setCurrentOrderDisplayName('')
    } catch (e) {
      setError(e instanceof Error ? e.message : `Failed to send to ${destination === 'bar' ? 'bar' : 'kitchen'}`)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCancelOrder() {
    if (!order || order.status !== 'pending') return
    const staffId = getStaffId()
    if (!staffId) return
    setCancelling(true)
    setError(null)
    try {
      if (!isOnline()) {
        currentOrderIdRef.current = null
        setOrder(null)
        setOrderType(null)
        setSelectedTableId(null)
        setCurrentOrderDisplayName('')
        setCancelling(false)
        return
      }
      const res = await posFetch(`/api/orders/${order.orderId}/cancel-pending`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffId }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const err = (data as { error?: string }).error || (data as { message?: string }).message || 'Failed to cancel order'
        throw new Error(err)
      }
      currentOrderIdRef.current = null
      setOrder(null)
      setOrderType(null)
      setSelectedTableId(null)
      setCurrentOrderDisplayName('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to cancel order')
    } finally {
      setCancelling(false)
    }
  }

  function handlePay() {
    const items = order?.items ?? []
    if (!order || items.length === 0) return
    router.push(`/pos/payment/${order.orderId}`)
  }

  const isFood = viewMode === 'food'
  const isDrinks = viewMode === 'drinks'
  const isSearchActive = searchQuery.trim().length > 0
  const showDrinkTierCards = isDrinks && !selectedDrinkTier && !isSearchActive
  const showSectionCards =
    (isFood && !selectedSubcategory && !isSearchActive) ||
    (isDrinks && !!selectedDrinkTier && !selectedSubcategory && !isSearchActive)
  const drinkSections = selectedDrinkTier === 'Alcoholic' ? ALCOHOLIC_SECTIONS : NON_ALCOHOLIC_SECTIONS
  const sections = isFood ? FOOD_SECTIONS : drinkSections

  const displayProducts = useMemo(() => {
    if (viewMode === 'popular') return popularProducts.slice(0, 4)
    if (selectedSubcategory) {
      const sel = String(selectedSubcategory ?? '').trim()
      return products.filter((p) => {
        const cat = String(p?.category ?? '').trim()
        const sec = String(p?.section ?? '').trim()
        if (isFood) return cat === 'Food' && sec === sel
        if (isDrinks) return cat === 'Drinks' && sec === sel
        return false
      })
    }
    return []
  }, [viewMode, selectedSubcategory, products, popularProducts, isFood, isDrinks])

  const searchFilter = useCallback(
    (p: PosProduct) =>
      !searchQuery.trim() || p.name.toLowerCase().includes(searchQuery.toLowerCase()),
    [searchQuery]
  )
  const filteredDisplayProducts = useMemo(
    () =>
      isSearchActive ? products.filter(searchFilter) : displayProducts.filter(searchFilter),
    [isSearchActive, products, displayProducts, searchFilter]
  )

  const searchSuggestions = useMemo(
    () =>
      searchQuery.trim()
        ? products.filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 10)
        : [],
    [searchQuery, products]
  )
  const showSearchSuggestions = searchFocused && searchQuery.trim().length > 0

  if (!staffOk) {
    return (
      <main className="pos-page flex items-center justify-center min-h-screen">
        <div className="pos-card max-w-sm w-full text-center">
          <p className="text-primary-600 dark:text-primary-300 m-0">Loading…</p>
        </div>
      </main>
    )
  }

  return (
    <main className="pos-page min-h-screen flex flex-col">
      <div className="flex-shrink-0 fixed top-0 left-0 right-0 z-[1020] bg-[var(--color-bg-primary)] px-4 pt-4 [&_.pos-dashboard-header]:mb-0">
        <PosNavHeader />
      </div>
      <div className="flex-shrink-0 min-h-[14rem]" aria-hidden />
      {error && (
        <div className="mx-4 mt-2 flex-shrink-0">
          <ErrorBanner message={error} onDismiss={() => setError(null)} />
        </div>
      )}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 overflow-hidden min-h-0">
        {/* Left: Categories */}
        <aside className="flex-shrink-0 w-full lg:w-44 flex flex-wrap gap-2 overflow-visible justify-center lg:justify-start lg:flex-col lg:py-2 lg:px-1 py-2 lg:items-stretch">
          {[
            { id: 'popular' as const, label: 'Most Popular', iconOutline: null, iconFilled: null },
            { id: 'food' as const, label: 'Food', iconOutline: IconSoup, iconFilled: IconSoupFilled },
            { id: 'drinks' as const, label: 'Drinks', iconOutline: IconGlass, iconFilled: IconGlassFilled },
          ].map(({ id, label, iconOutline, iconFilled }) => {
            const isActive = viewMode === id
            const CatIcon = isActive ? iconFilled : iconOutline
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setViewMode(id)
                  setSelectedDrinkTier(null)
                  setSelectedSubcategory(null)
                }}
                className={`btn pos-category-btn whitespace-nowrap py-2 px-3 text-sm inline-flex items-center justify-center gap-2 ${isActive ? 'btn-primary' : 'btn-outline'}`}
              >
                {CatIcon != null && (
                  <CatIcon className="w-4 h-4 shrink-0" aria-hidden stroke={1.5} />
                )}
                {label}
              </button>
            )
          })}
        </aside>

        {/* Center: Search + Subcategories or Products */}
        <section className="flex-1 overflow-auto min-h-0 flex flex-col gap-3">
          <div className="flex-shrink-0 flex justify-center w-full mt-6">
            <div className="relative w-full max-w-sm" ref={searchWrapperRef}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" aria-hidden />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              className="pos-input pl-10 pr-10 w-full"
              aria-label="Search products"
              aria-expanded={showSearchSuggestions}
              aria-autocomplete="list"
            />
            {searchQuery.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('')
                  setSearchFocused(false)
                  searchInputRef.current?.focus()
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center text-neutral-500 hover:text-neutral-700 hover:bg-neutral-200 dark:hover:text-neutral-300 dark:hover:bg-neutral-600 transition-colors"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            {showSearchSuggestions && (
              <ul
                className="absolute left-0 right-0 top-full mt-1 py-2 rounded-xl border-2 border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 shadow-lg z-50 max-h-60 overflow-auto"
                role="listbox"
              >
                {searchSuggestions.length === 0 ? (
                  <li className="px-4 py-3 text-sm text-neutral-500" role="option">No products match</li>
                ) : (
                  searchSuggestions.map((p) => (
                    <li key={p.productId} role="option">
                      <button
                        type="button"
                        className="w-full text-left px-4 py-2.5 text-sm font-medium text-neutral-800 dark:text-neutral-200 hover:bg-primary-50 dark:hover:bg-primary-900/30 focus:bg-primary-50 dark:focus:bg-primary-900/30 focus:outline-none"
                        onClick={() => {
                          setSearchQuery(p.name)
                          setSearchFocused(false)
                          if (p.category === 'Food') {
                            setViewMode('food')
                            setSelectedDrinkTier(null)
                            setSelectedSubcategory(p.section ?? '')
                          } else if (p.category === 'Drinks') {
                            setViewMode('drinks')
                            setSelectedDrinkTier(ALCOHOLIC_SECTIONS.includes(p.section ?? '') ? 'Alcoholic' : 'Non-Alcoholic')
                            setSelectedSubcategory(p.section ?? '')
                          }
                        }}
                      >
                        {p.name} — {p.priceUgx.toLocaleString()} UGX
                      </button>
                    </li>
                  ))
                )}
              </ul>
            )}
            </div>
          </div>

          {loading ? (
            <div className="flex flex-wrap justify-center gap-5 w-full mx-auto px-6 py-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="pos-card p-4 w-[calc((100%-1.25rem)/2)] sm:w-[calc((100%-2.5rem)/3)] md:w-[calc((100%-3.75rem)/4)] min-w-[140px]">
                  <SkeletonLoader variant="card" lines={2} />
                </div>
              ))}
            </div>
          ) : showDrinkTierCards ? (
            <div className="flex flex-wrap justify-center gap-5 w-full mx-auto px-6 py-4">
              {DRINK_TIERS.map((tier) => {
                const tierSections = tier === 'Alcoholic' ? ALCOHOLIC_SECTIONS : NON_ALCOHOLIC_SECTIONS
                const tierProducts = products.filter((p) => String(p?.category ?? '').trim() === 'Drinks' && tierSections.includes(String(p?.section ?? '').trim()))
                const count = tierProducts.length
                const heroProduct = tierProducts[pickHeroIndex(tier, count)] ?? tierProducts[0]
                const heroSrc = heroProduct?.images?.[0]
                const imgSrc = heroSrc && (heroSrc.startsWith('http') || heroSrc.startsWith('/')) ? heroSrc : PLACEHOLDER_IMAGE
                return (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => setSelectedDrinkTier(tier)}
                    className="pos-card p-0 overflow-hidden text-center hover:border-primary-400 dark:hover:border-primary-500 transition-all flex flex-col w-[calc((100%-1.25rem)/2)] sm:w-[calc((100%-2.5rem)/3)] md:w-[calc((100%-3.75rem)/4)] min-w-[140px]"
                  >
                    <div className="aspect-[4/3] relative w-full bg-neutral-100 dark:bg-neutral-800">
                      <Image src={imgSrc} alt={tier} fill className="object-cover" sizes="(max-width: 768px) 50vw, 25vw" />
                    </div>
                    <div className="p-4">
                      <span className="font-medium text-primary-800 dark:text-primary-100 block truncate">{tier}</span>
                      <span className="text-xs text-neutral-500 mt-0.5 block">{count} items</span>
                    </div>
                  </button>
                )
              })}
            </div>
          ) : showSectionCards ? (
            (() => {
              const sectionsWithProducts = sections.filter((sec) =>
                products.some((p) => String(p?.section ?? '').trim() === String(sec ?? '').trim())
              )
              if (sectionsWithProducts.length === 0) {
                return (
                  <EmptyState
                    icon={Package}
                    title="No products in catalog"
                    description="Add products to the database or run: npx prisma db seed"
                  />
                )
              }
              return (
            <div className="flex flex-wrap justify-center gap-5 w-full mx-auto px-6 py-4">
              {sectionsWithProducts.map((sec) => {
                const secProducts = products.filter((p) => String(p?.section ?? '').trim() === String(sec ?? '').trim())
                const heroProduct = secProducts[pickHeroIndex(sec, secProducts.length)] ?? secProducts[0]
                const heroSrc = heroProduct.images?.[0]
                const imgSrc = heroSrc && (heroSrc.startsWith('http') || heroSrc.startsWith('/')) ? heroSrc : PLACEHOLDER_IMAGE
                return (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => setSelectedSubcategory(sec)}
                    className="pos-card p-0 overflow-hidden text-center hover:border-primary-400 dark:hover:border-primary-500 transition-all flex flex-col w-[calc((100%-1.25rem)/2)] sm:w-[calc((100%-2.5rem)/3)] md:w-[calc((100%-3.75rem)/4)] min-w-[140px]"
                  >
                    <div className="aspect-[4/3] relative w-full bg-neutral-100 dark:bg-neutral-800">
                      <Image src={imgSrc} alt={sec} fill className="object-cover" sizes="(max-width: 768px) 50vw, 25vw" />
                    </div>
                    <div className="p-4">
                      <span className="font-medium text-primary-800 dark:text-primary-100 block truncate">{sec}</span>
                      <span className="text-xs text-neutral-500 mt-0.5 block">{secProducts.length} items</span>
                    </div>
                  </button>
                )
              })}
            </div>
              )
            })()
          ) : filteredDisplayProducts.length === 0 ? (
            <EmptyState
              icon={Package}
              title={isSearchActive ? 'No products match your search' : 'No products found'}
              description={
                isSearchActive
                  ? `No products found matching "${searchQuery}"`
                  : selectedSubcategory
                    ? `No products in "${selectedSubcategory}"`
                    : viewMode === 'popular'
                      ? 'Order items to see most popular products'
                      : `No ${viewMode} items`
              }
            />
          ) : (
            <>
              {selectedSubcategory && (
                <div className="text-center w-full py-3 mb-2">
                  <h2 className="pos-section-title text-xl text-neutral-600 dark:text-neutral-400">
                    {selectedSubcategory.toUpperCase()}
                  </h2>
                  {selectedSubcategory === 'Weekend Burger Offers' && (
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1 mb-0">(All served with fries and side salad.)</p>
                  )}
                </div>
              )}
              <div className="flex flex-wrap justify-center gap-5 w-full mx-auto px-6 py-4">
              {filteredDisplayProducts.map((product) => {
                const itemInOrder = (order?.items ?? []).find((i) => i.productId === product.productId)
                return (
                  <button
                    key={product.productId}
                    type="button"
                    onClick={() => handleProductClick(product)}
                    disabled={addingItem}
                    className="pos-card p-4 text-center hover:border-primary-400 dark:hover:border-primary-500 disabled:opacity-60 transition-all relative group flex flex-col overflow-hidden w-[calc((100%-1.25rem)/2)] sm:w-[calc((100%-2.5rem)/3)] md:w-[calc((100%-3.75rem)/4)] min-w-[140px]"
                  >
                    {itemInOrder && (
                      <span className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-primary-600 text-white text-xs font-bold flex items-center justify-center">
                        {itemInOrder.quantity}
                      </span>
                    )}
                    <div className="mb-2">
                      <ProductImage product={product} />
                    </div>
                    <p className="font-medium text-primary-800 dark:text-primary-100 m-0 truncate text-sm">{product.name}</p>
                    {product.section && (
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 m-0 mt-0.5 truncate">{product.section}</p>
                    )}
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 m-0 mt-1 font-medium">
                      {product.priceUgx.toLocaleString()} UGX
                    </p>
                  </button>
                )
              })}
              </div>
            </>
          )}
          {((isFood && selectedSubcategory) || (isDrinks && (selectedDrinkTier || selectedSubcategory))) && (
            <div className="flex justify-center w-full mb-6">
              <button
                type="button"
                onClick={() => (selectedSubcategory ? setSelectedSubcategory(null) : setSelectedDrinkTier(null))}
                className="btn btn-outline text-sm"
              >
                ⇐ Back to {selectedSubcategory ? (isFood ? 'Food' : selectedDrinkTier ?? 'Drinks') : 'Drinks'}
              </button>
            </div>
          )}
        </section>

        {/* Right: Order panel */}
        <aside className="flex-shrink-0 w-full lg:w-80 flex flex-col pos-card p-5 min-h-[200px] lg:min-h-0 lg:sticky lg:top-4 pr-8 mr-2">
          <h2 className="pos-section-title text-lg mb-3 text-center">Current Order</h2>

          {!order && !(creating && currentOrderDisplayName) ? (
            <EmptyState
              icon={ShoppingCart}
              title="No order yet"
              description="Start adding items"
              action={
                <button
                  type="button"
                  onClick={openNewOrderModal}
                  disabled={creating}
                  className="btn btn-primary py-3 px-6 disabled:opacity-60"
                >
                  {creating ? 'Creating…' : 'New Order'}
                </button>
              }
            />
          ) : creating && currentOrderDisplayName && !order ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">Creating order…</p>
              <p className="font-medium text-primary-700 dark:text-primary-200">#{currentOrderDisplayName}</p>
            </div>
          ) : order ? (
            <div className="flex flex-col min-w-0">
              <p className="text-sm text-neutral-600 dark:text-neutral-400 m-0 mb-2 text-center">
                  #{currentOrderDisplayName || order.orderNumber} · {order.status}
                  {(orderType ?? order?.orderType) && (
                    <span className="ml-1">
                      · {(orderType ?? order.orderType) === 'dine_in' ? 'Dine-in' : 'Takeaway'}
                      {order.tableCode && ` · Table ${order.tableCode}`}
                    </span>
                  )}
                </p>
                <ul className="list-none m-0 space-y-3 mb-4 border-2 border-neutral-400 dark:border-neutral-400 rounded-lg p-3 bg-neutral-50 dark:bg-neutral-800">
                {(order?.items ?? []).length === 0 ? (
                  <EmptyState icon={Package} title="No items yet" description="Add products from the menu" />
                ) : (
                  (order?.items ?? []).map((item, index) => {
                    const imgSrc = item.imageUrl && (item.imageUrl.startsWith('http') || item.imageUrl.startsWith('/')) ? item.imageUrl : PLACEHOLDER_IMAGE
                    return (
                    <Fragment key={item.id}>
                    <li className="flex items-center justify-between gap-3 py-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="relative w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden bg-neutral-100 dark:bg-neutral-800">
                          <Image src={imgSrc} alt="" fill className="object-cover" sizes="48px" />
                          {order.status === 'pending' && (
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item)}
                              disabled={removingItemId !== null || addingItem}
                              className="absolute inset-0 flex items-center justify-center bg-black/40 transition-colors hover:bg-black/55 disabled:opacity-60 text-neutral-200 hover:text-white dark:text-neutral-300 dark:hover:text-primary-100"
                              aria-label={`Remove ${item.productName} from order`}
                            >
                              <X className="w-6 h-6 pointer-events-none drop-shadow-sm" strokeWidth={1.5} aria-hidden />
                            </button>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="m-0 font-medium truncate text-sm">{item.productName}</p>
                          <p className="m-0 text-xs text-neutral-500 mt-0.5">
                            {(item.subtotalUgx ?? item.lineTotalUgx ?? 0).toLocaleString()} UGX
                          </p>
                        </div>
                      </div>
                      <div className="inline-flex items-stretch">
                        <div className="flex items-center justify-center px-3 py-1.5 min-w-[2rem] bg-neutral-100 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-l-xl border-r-0 font-semibold text-sm">
                          {item.quantity}
                        </div>
                        <div className="flex flex-col border border-neutral-200 dark:border-neutral-600 rounded-r-xl border-l-0 overflow-hidden bg-neutral-100 dark:bg-neutral-700">
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(item.id, 1)}
                            disabled={addingItem}
                            className="flex items-center justify-center p-2 text-neutral-500 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors border-b border-neutral-200 dark:border-neutral-600 disabled:opacity-60"
                            aria-label="Increase"
                          >
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M6 3v6M3 6h6" /></svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(item.id, -1)}
                            disabled={addingItem || item.quantity <= 1}
                            className="flex items-center justify-center p-2 text-neutral-500 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors disabled:opacity-60"
                            aria-label="Decrease"
                          >
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M3 6h6" /></svg>
                          </button>
                        </div>
                      </div>
                    </li>
                    {index < (order?.items ?? []).length - 1 && <li aria-hidden className="pos-order-item-divider" />}
                  </Fragment>
                  )
                  })
                )}
                </ul>

                {removedForUndo && (
                <div className="flex items-center justify-between gap-2 py-2 px-3 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-600 text-sm">
                  <span className="text-neutral-600 dark:text-neutral-400 truncate min-w-0">Removed {removedForUndo.productName}</span>
                  <div className="flex items-center gap-1.5 shrink-0 self-center">
                    <button
                      type="button"
                      onClick={handleUndoRemove}
                      disabled={addingItem}
                      className="font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 disabled:opacity-60 transition-colors leading-none"
                    >
                      Undo
                    </button>
                    <button
                      type="button"
                      onClick={() => setRemovedForUndo(null)}
                      className="inline-flex items-center justify-center w-6 h-6 rounded text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors leading-none"
                      aria-label="Confirm removal"
                    >
                      <X className="w-4 h-4 shrink-0" strokeWidth={1.5} aria-hidden />
                    </button>
                  </div>
                </div>
                )}

              <div className="border-t border-neutral-200 dark:border-neutral-700 pt-4 pr-2 flex flex-col items-center text-center">
                <p className="font-semibold text-xl text-primary-700 dark:text-primary-200 mb-4">
                  Total: {(order?.totalUgx ?? 0).toLocaleString()} UGX
                </p>
                {order.status === 'pending' && (
                  <>
                    <div className="mb-4">
                      <label className="block mb-2">
                        <span className="pos-label">Service Type</span>
                        <div className="relative mt-1">
                          <select
                            ref={serviceTypeSelectRef}
                            value={orderType || order?.orderType || ''}
                            onMouseDown={() => {
                              // Toggle immediately on click - this fires before onFocus
                              serviceTypeJustClicked.current = true
                              setServiceTypeDropdownOpen((prev) => !prev)
                            }}
                            onFocus={() => {
                              // Only set to open if we didn't just click (to prevent overriding toggle)
                              if (!serviceTypeJustClicked.current) {
                                setServiceTypeDropdownOpen(true)
                              }
                              serviceTypeJustClicked.current = false
                            }}
                            onBlur={() => {
                              // When select loses focus, dropdown closes
                              setServiceTypeDropdownOpen(false)
                              serviceTypeJustClicked.current = false
                            }}
                            onChange={(e) => {
                              const newType = e.target.value as 'takeaway' | 'dine_in'
                              setOrderType(newType)
                              if (newType === 'takeaway') {
                                setSelectedTableId(null)
                              }
                              // After selecting, dropdown closes
                              setServiceTypeDropdownOpen(false)
                            }}
                            className={`pos-input pos-select-service-type w-full pr-10 pl-3 [appearance:none] [&::-webkit-appearance:none] [&::-moz-appearance:none] dark:[&::-webkit-inner-spin-button]:appearance-none dark:[&::-webkit-calendar-picker-indicator]:hidden dark:[&::-moz-appearance:none] ${!orderType && !order?.orderType ? 'text-transparent' : ''}`}
                          >
                            <option value="" disabled hidden>Select service type...</option>
                            <option value="takeaway">Takeaway</option>
                            <option value="dine_in">Dine In</option>
                          </select>
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500 dark:text-neutral-400 text-lg leading-none">
                            {serviceTypeDropdownOpen ? '⇑' : '⇓'}
                          </span>
                          {!orderType && !order?.orderType && (
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400 dark:text-neutral-500 text-sm select-none">
                              Select service type...
                            </span>
                          )}
                        </div>
                      </label>
                      {orderType === 'dine_in' && (
                        <div className="mt-3">
                          <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Select Table</p>
                          <div className="relative" ref={tableSearchWrapperRef}>
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" aria-hidden />
                            <input
                              ref={tableSearchInputRef}
                              type="text"
                              placeholder="Search tables..."
                              value={tableSearchQuery}
                              onChange={(e) => setTableSearchQuery(e.target.value)}
                              onFocus={() => setTableSearchFocused(true)}
                              className="pos-input pl-10 pr-10 w-full"
                              aria-label="Search tables"
                              aria-expanded={tableSearchFocused && tableSearchQuery.trim().length > 0}
                            />
                            {tableSearchQuery.length > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setTableSearchQuery('')
                                  setTableSearchFocused(false)
                                }}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center text-neutral-500 hover:text-neutral-700 hover:bg-neutral-200 dark:hover:text-neutral-300 dark:hover:bg-neutral-600"
                                aria-label="Clear"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                            {tableSearchFocused && tableSearchQuery.trim().length > 0 && (
                              <ul className="absolute z-50 w-full mt-1 py-2 rounded-xl border-2 border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 shadow-lg max-h-60 overflow-auto list-none">
                                {tables
                                  .filter(
                                    (table) =>
                                      table.tableCode.toLowerCase().includes(tableSearchQuery.toLowerCase()) &&
                                      (!table.isFull || table.tableId === selectedTableId)
                                  )
                                  .slice(0, 10)
                                  .length === 0 ? (
                                    <li className="px-4 py-3 text-sm text-neutral-500 dark:text-neutral-400">
                                      No tables match
                                    </li>
                                  ) : (
                                    tables
                                      .filter(
                                        (table) =>
                                          table.tableCode.toLowerCase().includes(tableSearchQuery.toLowerCase()) &&
                                          (!table.isFull || table.tableId === selectedTableId)
                                      )
                                      .slice(0, 10)
                                      .map((table) => (
                                        <li key={table.tableId}>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setSelectedTableId(table.tableId)
                                              setTableSearchQuery(table.tableCode)
                                              setTableSearchFocused(false)
                                            }}
                                            className="w-full text-left px-4 py-2.5 text-sm font-medium text-neutral-800 dark:text-neutral-200 hover:bg-primary-50 dark:hover:bg-primary-900/30 focus:bg-primary-50 dark:focus:bg-primary-900/30 focus:outline-none"
                                          >
                                            <span className="text-primary-700 dark:text-primary-300">Table {table.tableCode}</span>
                                            {table.capacity != null && (
                                              <span className="text-neutral-500 dark:text-neutral-400 ml-2">
                                                ({table.activeOrderCount != null ? `${table.activeOrderCount}/${table.capacity}` : table.capacity} seats)
                                              </span>
                                            )}
                                          </button>
                                        </li>
                                      ))
                                  )}
                              </ul>
                            )}
                          </div>
                          {selectedTableId && (
                            <p className="text-xs text-primary-600 dark:text-primary-400 mt-1">
                              Selected: {tables.find((t) => t.tableId === selectedTableId)?.tableCode}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}
                <div className="flex flex-col gap-2 w-full items-center">
                  {order.status === 'pending' && !orderSent ? (
                    <>
                      {orderHasBoth && (
                        <p className="text-sm text-amber-700 dark:text-amber-300 mb-1 text-center">
                          Please make separate orders for Food and Drinks.
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={handleSendToKitchenOrBarClick}
                        disabled={submitting || cancelling || orderHasBoth || (order?.items ?? []).length === 0 || !orderType || (orderType === 'dine_in' && !selectedTableId)}
                        className="btn btn-primary py-3 disabled:opacity-60 w-full max-w-xs"
                      >
                        {submitting ? 'Sending…' : orderHasDrinks && !orderHasFood ? 'Send to Bar' : 'Send to Kitchen'}
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelOrder}
                        disabled={submitting || cancelling}
                        className="btn border-2 border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 py-3 w-full max-w-xs"
                      >
                        {cancelling ? 'Cancelling…' : 'Cancel Order'}
                      </button>
                    </>
                  ) : (
                    <Link
                      href="/pos/ready"
                      className="btn btn-primary py-3 w-full max-w-xs inline-block text-center"
                    >
                      Go to Ready to pay →
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </aside>
      </div>

      {/* Modifier modal – lazy-loaded when needed */}
      {modifierProduct && (
        <ModifierModal
          product={modifierProduct}
          modifierSelections={modifierSelections}
          onSelectionChange={(group, option) => setModifierSelections((s) => ({ ...s, [group]: option }))}
          onCancel={() => {
            setModifierProduct(null)
            setModifierSelections({})
          }}
          onConfirm={handleModifierConfirm}
          addingItem={addingItem}
        />
      )}

      <div className="flex-shrink-0 p-4 border-t border-neutral-200 dark:border-neutral-700">
        <Link href="/pos/close" className="btn btn-outline py-2.5 px-4 text-sm font-medium">
          Close Shift
        </Link>
      </div>

      <PreparationNotesModal
        open={preparationNotesModalOpen && pendingSendDestination !== null}
        title="Order notes (optional)"
        confirmLabel={pendingSendDestination === 'bar' ? 'Send to Bar' : 'Send to Kitchen'}
        onConfirm={(notes) => {
          if (pendingSendDestination) doSendToKitchenOrBar(pendingSendDestination, notes)
        }}
        onCancel={() => {
          setPreparationNotesModalOpen(false)
          setPendingSendDestination(null)
        }}
      />

      {mixedOrderPopupOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 dark:bg-black/60" role="dialog" aria-modal="true">
          <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-800 w-full max-w-md p-4">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">Separate orders required</h2>
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              This order contains both Food and Drinks. Please create separate orders: one for Food (Send to Kitchen) and one for Drinks (Send to Bar).
            </p>
            <button type="button" onClick={() => setMixedOrderPopupOpen(false)} className="btn btn-primary w-full">
              OK
            </button>
          </div>
        </div>
      )}

      <OrderNameModal
        open={orderNameModalOpen}
        title="Order name"
        onConfirm={handleOrderNameConfirm}
        onCancel={() => {
          setOrderNameModalOpen(false)
          pendingOrderNameAction.current = null
        }}
        cancelLabel="Cancel Order"
      />
    </main>
  )
}
