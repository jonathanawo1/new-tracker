import { useState, useRef, useEffect } from 'react'
import { initializeApp, getApps, getApp } from 'firebase/app'
import { getFirestore, doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore'

const PLATFORMS = ["StockX","GOAT","eBay","Grailed","TCGPlayer","Depop","Poshmark","Facebook Marketplace","Local","Other"]
const STATUSES  = ["In Hand","Listed","Sold","Pending"]
const STATUS_COLORS = {
  "In Hand": { bg:"#1a1a2e", accent:"#4a9eff", text:"#4a9eff" },
  "Listed":  { bg:"#1a2a1a", accent:"#4caf50", text:"#4caf50" },
  "Sold":    { bg:"#2a1a2e", accent:"#c084fc", text:"#c084fc" },
  "Pending": { bg:"#2a2a1a", accent:"#f59e0b", text:"#f59e0b" },
}
const CATEGORIES = {
  "💟 Sneakers":      { emoji:"💟", label:"Sneakers",      sub1:"Colorway",         sub2:"SKU",          sizeType:"shoe"    },
  "🃏 Trading Cards": { emoji:"🃏", label:"Trading Cards", sub1:"Set / Edition",    sub2:"Card #",       sizeType:"none"    },
  "👕 Clothing":      { emoji:"👕", label:"Clothing",      sub1:"Color / Style",    sub2:"SKU",          sizeType:"apparel" },
  "🎮 Electronics":   { emoji:"🎮", label:"Electronics",   sub1:"Model / Variant",  sub2:"Serial / SKU", sizeType:"none"    },
  "🧸 Collectibles":  { emoji:"🧸", label:"Collectibles",  sub1:"Variant / Color",  sub2:"Item #",       sizeType:"none"    },
  "💿 Media":         { emoji:"💿", label:"Media",         sub1:"Edition / Format", sub2:"Catalog #",    sizeType:"none"    },
  "🛍️ General":      { emoji:"🛍️", label:"General",       sub1:"Variant",          sub2:"SKU",          sizeType:"none"    },
}
const SHOE_SIZES    = ["3","3.5","4","4.5","5","5.5","6","6.5","7","7.5","8","8.5","9","9.5","10","10.5","11","11.5","12","12.5","13","14","15"]
const APPAREL_SIZES = ["XS","S","M","L","XL","XXL","3XL"]

const num = v => parseFloat(v) || 0
const fmt = n => (!n && n !== 0) ? "—" : `£${Number(n).toFixed(2)}`
const today = () => new Date().toISOString().slice(0, 10)

function calcProfit(item) {
  if (!item.sellPrice) return null
  const gross = num(item.sellPrice)
  return gross - num(item.buyPrice) - gross * (num(item.platformFee) / 100) - num(item.shippingCost)
}

function newItem() {
  return { id: Date.now().toString(), name:"", sub1:"", sub2:"", size:"", qty:"1",
    buyPrice:"", sellPrice:"", platformFee:"", shippingCost:"",
    platform:"", status:"In Hand", notes:"", dateAdded: today(), bundleId: "" }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result.split(',')[1])
    r.onerror = reject
    r.readAsDataURL(file)
  })
}

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyC6KYx7FHFGeipSaiL5X2iV4EwMprK2_CQ",
  authDomain: "newtracker-9ff56.firebaseapp.com",
  projectId: "newtracker-9ff56",
  storageBucket: "newtracker-9ff56.firebasestorage.app",
  messagingSenderId: "251436391719",
  appId: "1:251436391719:web:205c76a87b2c1b6e651d02",
}

function getDb() {
  try {
    const app = getApps().length ? getApp() : initializeApp(FIREBASE_CONFIG)
    return getFirestore(app)
  } catch { return null }
}
const getSyncId = () => localStorage.getItem('rl_sync_id') || ''
const generateId = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2,10) + Date.now().toString(36))

const SEED_ITEMS = [
  { id:"1747440000001", name:"AP Swatch Ocho Negro", sub1:"", sub2:"", size:"", qty:"1",
    buyPrice:"335", sellPrice:"1600", platformFee:"", shippingCost:"40",
    platform:"", status:"Sold", notes:"", dateAdded:"2026-05-17" },
  { id:"1747872000001", name:"Chaos Rising ETB", sub1:"", sub2:"", size:"", qty:"1",
    buyPrice:"49", sellPrice:"58", platformFee:"", shippingCost:"",
    platform:"", status:"Sold", notes:"", dateAdded:"2026-05-22" },
  { id:"1747872000002", name:"Chaos Rising ETB", sub1:"", sub2:"", size:"", qty:"1",
    buyPrice:"49", sellPrice:"55", platformFee:"", shippingCost:"",
    platform:"", status:"Sold", notes:"", dateAdded:"2026-05-22" },
  { id:"1747872000003", name:"Chaos Rising ETB", sub1:"", sub2:"", size:"", qty:"1",
    buyPrice:"49", sellPrice:"60", platformFee:"", shippingCost:"",
    platform:"", status:"Sold", notes:"", dateAdded:"2026-05-22" },
  { id:"1747872000004", name:"Chaos Rising ETB", sub1:"", sub2:"", size:"", qty:"1",
    buyPrice:"49", sellPrice:"57", platformFee:"", shippingCost:"",
    platform:"", status:"Sold", notes:"", dateAdded:"2026-05-22" },
  { id:"1747872000005", name:"Chaos Rising Half Booster", sub1:"", sub2:"", size:"", qty:"2",
    buyPrice:"71", sellPrice:"76", platformFee:"", shippingCost:"4",
    platform:"", status:"Sold", notes:"RRP £142 total, sold £152 total, costs £8", dateAdded:"2026-05-22" },
  { id:"1747872000006", name:"Chaos Rising Half Booster", sub1:"", sub2:"", size:"", qty:"5",
    buyPrice:"72", sellPrice:"80", platformFee:"", shippingCost:"",
    platform:"", status:"Sold", notes:"RRP £360 total, sold £400 total", dateAdded:"2026-05-22" },
  { id:"1748390400001", name:"Topps Chrome Arsenal", sub1:"", sub2:"", size:"", qty:"1",
    buyPrice:"200", sellPrice:"302", platformFee:"", shippingCost:"10",
    platform:"", status:"Sold", notes:"", dateAdded:"2026-05-28" },
  { id:"1748390400002", name:"Topps Chrome Arsenal", sub1:"", sub2:"", size:"", qty:"1",
    buyPrice:"200", sellPrice:"250", platformFee:"", shippingCost:"",
    platform:"", status:"Sold", notes:"", dateAdded:"2026-05-28" },
  { id:"1748476800001", name:"Supreme Wings Football Jersey", sub1:"", sub2:"", size:"", qty:"1",
    buyPrice:"138", sellPrice:"158", platformFee:"", shippingCost:"5",
    platform:"", status:"Sold", notes:"", dateAdded:"2026-05-29" },
  { id:"1748476800002", name:"Travis Scott Jordan 1 Pink Muslin", sub1:"Pink Muslin", sub2:"", size:"8",
    buyPrice:"145", sellPrice:"370", platformFee:"", shippingCost:"59",
    platform:"", status:"Sold", notes:"UK 8", dateAdded:"2026-05-29" },
  { id:"1748822400001", name:"Fanatics", sub1:"", sub2:"", size:"", qty:"2",
    buyPrice:"135", sellPrice:"220", platformFee:"", shippingCost:"10",
    platform:"", status:"Sold", notes:"RRP £270 total, sold £440 total, costs £20", dateAdded:"2026-06-02" },
  { id:"1749340800001", name:"Nike Minds Black", sub1:"", sub2:"", size:"8",
    buyPrice:"80", sellPrice:"115", platformFee:"", shippingCost:"",
    platform:"", status:"Sold", notes:"UK 8", dateAdded:"2026-06-08" },
  { id:"1749686400001", name:"Palace Pewter Grey", sub1:"", sub2:"", size:"XXL",
    buyPrice:"", sellPrice:"85", platformFee:"", shippingCost:"3.67",
    platform:"", status:"Sold", notes:"Day costs £22 split", dateAdded:"2026-06-12" },
  { id:"1749686400002", name:"Palace Pewter Grey", sub1:"", sub2:"", size:"L",
    buyPrice:"", sellPrice:"85", platformFee:"", shippingCost:"3.67",
    platform:"", status:"Sold", notes:"Day costs £22 split", dateAdded:"2026-06-12" },
  { id:"1749686400003", name:"Palace Grey Drill Top", sub1:"", sub2:"", size:"L",
    buyPrice:"", sellPrice:"105", platformFee:"", shippingCost:"3.67",
    platform:"", status:"Sold", notes:"Day costs £22 split", dateAdded:"2026-06-12" },
  { id:"1749686400004", name:"Palace Pewter White", sub1:"", sub2:"", size:"L",
    buyPrice:"", sellPrice:"85.86", platformFee:"", shippingCost:"3.67",
    platform:"", status:"Sold", notes:"Day costs £22 split", dateAdded:"2026-06-12" },
  { id:"1749686400005", name:"Palace Pewter Grey", sub1:"", sub2:"", size:"M",
    buyPrice:"", sellPrice:"80", platformFee:"", shippingCost:"3.65",
    platform:"", status:"Sold", notes:"Day costs £22 split", dateAdded:"2026-06-12" },
  { id:"1749686400006", name:"Patta Exclusive Jersey", sub1:"", sub2:"", size:"L",
    buyPrice:"", sellPrice:"143.56", platformFee:"", shippingCost:"3.67",
    platform:"", status:"Sold", notes:"Day costs £22 split", dateAdded:"2026-06-12" },
  { id:"1749945600001", name:"Patta Tech Fleece", sub1:"", sub2:"", size:"L",
    buyPrice:"225", sellPrice:"346.37", platformFee:"", shippingCost:"",
    platform:"", status:"Sold", notes:"", dateAdded:"2026-06-16" },
]

function load() {
  try {
    const raw = localStorage.getItem('rl_items')
    const parsed = raw ? JSON.parse(raw) : []
    const items = parsed.length > 0 ? parsed : SEED_ITEMS
    if (parsed.length === 0) localStorage.setItem('rl_items', JSON.stringify(SEED_ITEMS))
    return {
      items,
      category: localStorage.getItem('rl_category') || '💟 Sneakers',
    }
  } catch { return { items: SEED_ITEMS, category: '💟 Sneakers' } }
}

const inpStyle = {
  background:'#111120', border:'1px solid #2a2a3e', borderRadius:7,
  color:'#e8e8f0', padding:'9px 12px', fontSize:14, outline:'none', width:'100%',
}
const lblStyle = {
  fontSize:10, fontWeight:700, color:'#666', letterSpacing:'.07em', textTransform:'uppercase',
}
const overlayStyle = {
  position:'fixed', inset:0, background:'rgba(0,0,0,.85)', zIndex:200,
  display:'flex', padding:16, alignItems:'flex-end', justifyContent:'center',
}
const sheetStyle = {
  background:'#0f0f1e', border:'1px solid #2a2a3e', borderRadius:'16px 16px 0 0',
  width:'100%', maxWidth:540, display:'flex', flexDirection:'column',
}

export default function App() {
  const stored = load()
  const [items, setItems]         = useState(stored.items)
  const [category, setCategory]   = useState(stored.category)
  const [filterStatus, setFilter] = useState('All')
  const [search, setSearch]       = useState('')
  const [catOpen, setCatOpen]     = useState(false)
  const [editItem, setEditItem]   = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [deleteId, setDeleteId]   = useState(null)
  const [toast, setToast]         = useState({ msg:'', show:false })
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [emailPrompt, setEmailPrompt]   = useState(null)
  const [cloudStatus, setCloudStatus]   = useState('local')
  const toastRef  = useRef(null)
  const skipNext  = useRef(false)
  const itemsRef  = useRef(items)
  const categoryRef = useRef(category)

  useEffect(() => { itemsRef.current = items }, [items])
  useEffect(() => { categoryRef.current = category }, [category])

  useEffect(() => {
    const db = getDb()
    const syncId = getSyncId()
    if (!db || !syncId) return
    const ref = doc(db, 'ledgers', syncId)

    // Immediately pull on load so new devices get data right away
    getDoc(ref).then(snap => {
      if (snap.exists()) {
        const data = snap.data()
        if (Array.isArray(data.items) && data.items.length > 0) {
          setItems(data.items)
          localStorage.setItem('rl_items', JSON.stringify(data.items))
        }
        if (data.category) {
          setCategory(data.category)
          localStorage.setItem('rl_category', data.category)
        }
        setCloudStatus('synced')
      }
    }).catch(() => setCloudStatus('error'))

    // Then keep listening for real-time updates
    const unsub = onSnapshot(ref, snap => {
      if (skipNext.current) { skipNext.current = false; return }
      if (snap.exists()) {
        const data = snap.data()
        if (Array.isArray(data.items) && data.items.length > 0) {
          setItems(data.items)
          localStorage.setItem('rl_items', JSON.stringify(data.items))
        }
        if (data.category) {
          setCategory(data.category)
          localStorage.setItem('rl_category', data.category)
        }
      }
      setCloudStatus('synced')
    }, () => setCloudStatus('error'))
    return unsub
  }, [])

  async function pullFromCloud() {
    const db = getDb()
    const syncId = getSyncId()
    if (!db || !syncId) return
    const snap = await getDoc(doc(db, 'ledgers', syncId))
    if (snap.exists()) {
      const data = snap.data()
      if (Array.isArray(data.items) && data.items.length > 0) {
        setItems(data.items)
        localStorage.setItem('rl_items', JSON.stringify(data.items))
      }
      if (data.category) {
        setCategory(data.category)
        localStorage.setItem('rl_category', data.category)
      }
      setCloudStatus('synced')
    }
  }

  async function pushToCloud(nextItems, nextCat) {
    const db = getDb()
    const syncId = getSyncId()
    if (!db || !syncId) return
    skipNext.current = true
    try {
      await setDoc(doc(db, 'ledgers', syncId), { items: nextItems, category: nextCat })
      setCloudStatus('synced')
    } catch {
      skipNext.current = false
      setCloudStatus('error')
    }
  }

  const cat = CATEGORIES[category] || CATEGORIES["🛍️ General"]

  function persist(nextItems, nextCat) {
    localStorage.setItem('rl_items', JSON.stringify(nextItems))
    localStorage.setItem('rl_category', nextCat)
    pushToCloud(nextItems, nextCat)
  }
  function updateItems(fn) {
    setItems(prev => { const next = fn(prev); persist(next, categoryRef.current); return next })
  }
  function updateCategory(key) {
    setCategory(key); persist(itemsRef.current, key)
  }
  function showToast(msg) {
    clearTimeout(toastRef.current)
    setToast({ msg, show:true })
    toastRef.current = setTimeout(() => setToast(t => ({...t, show:false})), 2200)
  }
  function getSizeOpts() {
    if (cat.sizeType === 'shoe')    return SHOE_SIZES
    if (cat.sizeType === 'apparel') return APPAREL_SIZES
    return null
  }

  // ── Stats ──
  const sold        = items.filter(i => i.status === 'Sold')
  const totalProfit = sold.reduce((s,i) => s + (calcProfit(i) ?? 0) * num(i.qty||1), 0)
  const totalInvest = items.reduce((s,i) => s + num(i.buyPrice) * num(i.qty||1) + num(i.shippingCost), 0)
  const totalUnits  = items.reduce((s,i) => s + num(i.qty||1), 0)
  const soldUnits   = sold.reduce((s,i) => s + num(i.qty||1), 0)
  const stockValue  = items.filter(i => !num(i.sellPrice))
                           .reduce((s,i) => s + num(i.buyPrice) * num(i.qty||1) + num(i.shippingCost), 0)

  const filtered = items.filter(i => {
    const ms = filterStatus === 'All' || i.status === filterStatus
    const mq = [i.name,i.sub1,i.sub2,i.platform].join(' ').toLowerCase().includes(search.toLowerCase())
    return ms && mq
  })

  function openAdd()    { setEditItem(newItem()); setIsEditing(false) }
  function openEdit(id) { const it = items.find(i=>i.id===id); if(it){setEditItem({...it});setIsEditing(true)} }
  function closeEdit()  { setEditItem(null) }

  function saveItem(updated) {
    if (isEditing) {
      updateItems(prev => prev.map(i => i.id === updated.id ? updated : i))
      showToast('✅ Item updated')
    } else {
      updateItems(prev => [updated, ...prev])
      showToast('✅ Item added')
    }
    closeEdit()
    if (updated.status === 'Sold' && localStorage.getItem('rl_email')) {
      setEmailPrompt(updated)
    }
  }

  function deleteItem() {
    updateItems(prev => prev.filter(i => i.id !== deleteId))
    setDeleteId(null)
    showToast('🗑️ Item deleted')
  }

  function emailReceipt(item) {
    const userEmail = localStorage.getItem('rl_email') || ''
    const profit = calcProfit(item)
    const profitLine = profit != null
      ? `Profit (per unit): ${profit >= 0 ? '+' : ''}${fmt(profit)}`
      : ''
    const subject = encodeURIComponent(`Receipt: ${item.name} — ${fmt(item.sellPrice)}`)
    const body = encodeURIComponent(
      `RESELL LEDGER RECEIPT\n` +
      `─────────────────────\n` +
      `Item:      ${item.name}\n` +
      `Date:      ${item.dateAdded}\n` +
      `Platform:  ${item.platform || 'N/A'}\n` +
      `Qty:       ${item.qty || 1}\n` +
      `Buy Price: ${fmt(item.buyPrice)}\n` +
      `Sell Price:${fmt(item.sellPrice)}\n` +
      (profitLine ? `${profitLine}\n` : '') +
      (item.notes ? `\nNotes: ${item.notes}` : '')
    )
    window.location.href = `mailto:${userEmail}?subject=${subject}&body=${body}`
  }

  const syncDot = cloudStatus === 'synced' ? '#4caf50' : cloudStatus === 'error' ? '#f44336' : '#666'
  const syncTip = cloudStatus === 'synced' ? 'Synced' : cloudStatus === 'error' ? 'Sync error' : 'Local only'

  return (
    <div style={{background:'#0a0a0f',color:'#e8e8f0',fontFamily:"-apple-system,'Inter','Helvetica Neue',sans-serif",minHeight:'100vh',paddingBottom:60}}>

      <header style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 20px',borderBottom:'1px solid #1e1e2e',background:'#0d0d18',position:'sticky',top:0,zIndex:50}}>
        <div style={{position:'relative'}}>
          <button onClick={() => setCatOpen(v=>!v)}
            style={{display:'flex',alignItems:'center',gap:12,background:'none',border:'none',color:'inherit',padding:0,cursor:'pointer',WebkitTapHighlightColor:'transparent'}}>
            <span style={{fontSize:30,lineHeight:1}}>{cat.emoji}</span>
            <div>
              <div style={{fontSize:18,fontWeight:800,letterSpacing:'.12em',color:'#fff'}}>RESELL LEDGER</div>
              <div style={{fontSize:11,color:'#666',marginTop:2}}>
                {cat.label} Tracker <span style={{color:'#444'}}>· tap to change</span>
              </div>
            </div>
            <span style={{color:'#444',fontSize:13,marginLeft:4}}>▾</span>
          </button>
          {catOpen && (
            <>
              <div onClick={() => setCatOpen(false)} style={{position:'fixed',inset:0,zIndex:290}} />
              <div style={{position:'absolute',top:'calc(100% + 4px)',left:0,zIndex:300,background:'#13131f',border:'1px solid #2a2a3e',borderRadius:12,padding:8,minWidth:200,boxShadow:'0 8px 32px rgba(0,0,0,.7)'}}>
                {Object.entries(CATEGORIES).map(([key, val]) => (
                  <button key={key} onClick={() => { updateCategory(key); setCatOpen(false) }}
                    style={{display:'flex',alignItems:'center',gap:10,background:category===key?'#1e1e3e':'transparent',border:'none',color:category===key?'#fff':'#bbb',padding:'9px 14px',borderRadius:8,fontSize:14,fontWeight:600,width:'100%',cursor:'pointer',textAlign:'left'}}>
                    <span>{val.emoji}</span><span>{val.label}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <span title={syncTip} style={{width:8,height:8,borderRadius:'50%',background:syncDot,display:'inline-block',flexShrink:0}} />
          <button onClick={() => setSettingsOpen(true)}
            style={{background:'transparent',border:'1px solid #2a2a3e',color:'#888',borderRadius:8,padding:'8px 10px',fontSize:15,cursor:'pointer',lineHeight:1}}>
            ⚙️
          </button>
          <button onClick={openAdd}
            style={{background:'linear-gradient(135deg,#6366f1,#8b5cf6)',color:'#fff',border:'none',borderRadius:8,padding:'9px 18px',fontSize:13,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap'}}>
            + Add
          </button>
        </div>
      </header>

      <div style={{display:'flex',gap:10,padding:'14px 16px',borderBottom:'1px solid #1e1e2e',overflowX:'auto'}}>
        {[
          { lbl:'Total Profit', val:`£${totalProfit.toFixed(2)}`, color: totalProfit>=0?'#4caf50':'#f44' },
          { lbl:'Invested',     val:`£${totalInvest.toFixed(2)}`, color:'#4a9eff' },
          { lbl:'In Stock £',   val:`£${stockValue.toFixed(2)}`,  color:'#f59e0b' },
          { lbl:'Total Units',  val: totalUnits,                  color:'#c084fc' },
          { lbl:'Units Sold',   val: soldUnits,                   color:'#f59e0b' },
        ].map(s => (
          <div key={s.lbl} style={{flex:'0 0 auto',background:'#111120',border:'1px solid #1e1e2e',borderRadius:10,padding:'12px 16px',minWidth:110}}>
            <div style={{fontSize:20,fontWeight:800,lineHeight:1,color:s.color}}>{s.val}</div>
            <div style={{fontSize:10,color:'#666',marginTop:5,letterSpacing:'.06em',textTransform:'uppercase'}}>{s.lbl}</div>
          </div>
        ))}
      </div>

      <div style={{display:'flex',flexDirection:'column',gap:10,padding:'12px 16px',borderBottom:'1px solid #1e1e2e'}}>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          type="search" placeholder="Search items…"
          style={{...inpStyle,boxSizing:'border-box'}} />
        <div style={{display:'flex',gap:7,flexWrap:'wrap'}}>
          {['All',...STATUSES].map(st => {
            const sc = STATUS_COLORS[st]; const active = filterStatus === st
            return (
              <button key={st} onClick={() => setFilter(st)}
                style={{background: active ? (st==='All'?'#6366f1':sc.accent) : 'transparent',
                  border:`1px solid ${st==='All'?(active?'#6366f1':'#2a2a3e'):sc.accent}`,
                  color: active?'#fff':(st==='All'?'#666':sc.text),
                  borderRadius:20,padding:'5px 13px',fontSize:12,fontWeight:600,cursor:'pointer'}}>
                {st}
              </button>
            )
          })}
        </div>
      </div>

      <div style={{padding:'12px 16px',display:'flex',flexDirection:'column',gap:10}}>
        {filtered.length === 0 ? (
          <div style={{textAlign:'center',padding:'60px 20px',color:'#444',fontSize:15}}>
            {items.length === 0 ? 'No items yet — add your first flip!' : 'No items match your filters.'}
          </div>
        ) : (() => {
          const sorted = [...filtered].sort((a,b) => (b.dateAdded||'').localeCompare(a.dateAdded||''))
          // pre-compute profit and spend per date
          const profitByDate = {}
          const spendByDate = {}
          for (const item of sorted) {
            const d = item.dateAdded || ''
            const p = calcProfit(item)
            if (p != null) profitByDate[d] = (profitByDate[d] || 0) + p * num(item.qty||1)
            if (item.buyPrice) spendByDate[d] = (spendByDate[d] || 0) + num(item.buyPrice) * num(item.qty||1) + num(item.shippingCost)
          }

          // group items by bundleId
          const bundleMap = {}
          for (const item of sorted) {
            if (item.bundleId) {
              if (!bundleMap[item.bundleId]) bundleMap[item.bundleId] = []
              bundleMap[item.bundleId].push(item)
            }
          }
          const seenBundles = new Set()

          const groups = []
          let lastDate = null
          for (const item of sorted) {
            const d = item.dateAdded || ''
            if (d !== lastDate) { groups.push({ type:'date', date:d }); lastDate = d }
            if (item.bundleId) {
              if (!seenBundles.has(item.bundleId)) {
                seenBundles.add(item.bundleId)
                groups.push({ type:'bundle', bundleId: item.bundleId, items: bundleMap[item.bundleId] })
              }
            } else {
              groups.push({ type:'item', item })
            }
          }
          return groups.map((g, idx) => {
            if (g.type === 'date') {
              const label = g.date ? new Date(g.date + 'T12:00:00').toLocaleDateString('en-GB', { weekday:'short', day:'numeric', month:'long', year:'numeric' }) : 'No date'
              const dp = profitByDate[g.date]
              return (
                <div key={'d-'+g.date+idx} style={{display:'flex',alignItems:'center',gap:10,marginTop: idx===0?0:6}}>
                  <div style={{flex:1,height:1,background:'#1e1e2e'}} />
                  <span style={{fontSize:11,fontWeight:700,color:'#444',letterSpacing:'.06em',textTransform:'uppercase',whiteSpace:'nowrap'}}>{label}</span>
                  {spendByDate[g.date] != null && (
                    <span style={{fontSize:11,fontWeight:700,color:'#4a9eff',whiteSpace:'nowrap'}}>
                      spent {fmt(spendByDate[g.date])}
                    </span>
                  )}
                  {dp != null && (
                    <span style={{fontSize:11,fontWeight:700,color:dp>=0?'#4caf50':'#f44336',whiteSpace:'nowrap'}}>
                      {dp>=0?'+':''}{fmt(dp)}
                    </span>
                  )}
                  <div style={{flex:1,height:1,background:'#1e1e2e'}} />
                </div>
              )
            }
            if (g.type === 'bundle') {
              const bItems = g.items
              const totalBuy = bItems.reduce((s,i) => s + num(i.buyPrice)*num(i.qty||1), 0)
              const totalSell = bItems.reduce((s,i) => s + num(i.sellPrice)*num(i.qty||1), 0)
              const totalCosts = bItems.reduce((s,i) => s + num(i.shippingCost), 0)
              const totalFees = bItems.reduce((s,i) => s + num(i.sellPrice)*num(i.qty||1)*(num(i.platformFee)/100), 0)
              const bundleProfit = totalSell > 0 ? totalSell - totalBuy - totalCosts - totalFees : null
              const sc = STATUS_COLORS[bItems[0].status] || STATUS_COLORS['In Hand']
              return (
                <div key={'bundle-'+g.bundleId} style={{background:'#111120',border:'1px solid #2a2a4e',borderRadius:12,padding:'14px 16px'}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
                    <span style={{fontSize:10,fontWeight:700,color:'#6366f1',letterSpacing:'.06em',textTransform:'uppercase',background:'#1a1a3e',border:'1px solid #3a3a6e',borderRadius:20,padding:'2px 9px'}}>Bundle</span>
                    <span style={{fontSize:11,color:'#555'}}>{bItems.length} items</span>
                  </div>
                  {bItems.map(bi => {
                    const subLine = [bi.sub1,bi.sub2].filter(Boolean).join(' · ')
                    return (
                      <div key={bi.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8,padding:'7px 0',borderBottom:'1px solid #1a1a28'}}>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontWeight:600,color:'#e0e0f0',fontSize:13,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{bi.name}{bi.size ? ` · ${bi.size}` : ''}</div>
                          {subLine && <div style={{color:'#555',fontSize:11}}>{subLine}</div>}
                        </div>
                        <div style={{display:'flex',gap:8,alignItems:'center',flexShrink:0}}>
                          <span style={{fontSize:12,color:'#666'}}>{bi.buyPrice ? fmt(bi.buyPrice) : '—'}</span>
                          <button onClick={()=>openEdit(bi.id)} style={{background:'transparent',border:'1px solid #2a2a3e',borderRadius:6,padding:'4px 7px',fontSize:12,cursor:'pointer'}}>✏️</button>
                          <button onClick={()=>setDeleteId(bi.id)} style={{background:'transparent',border:'1px solid #2a1a1a',borderRadius:6,padding:'4px 7px',fontSize:12,cursor:'pointer'}}>🗑️</button>
                        </div>
                      </div>
                    )
                  })}
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6,marginTop:10,paddingTop:10}}>
                    <div>
                      <div style={{fontSize:10,color:'#555',textTransform:'uppercase',letterSpacing:'.05em'}}>Total Buy</div>
                      <div style={{fontSize:13,fontWeight:700}}>{totalBuy ? fmt(totalBuy) : '—'}</div>
                    </div>
                    <div>
                      <div style={{fontSize:10,color:'#555',textTransform:'uppercase',letterSpacing:'.05em'}}>Total Sell</div>
                      <div style={{fontSize:13,fontWeight:700}}>{totalSell ? fmt(totalSell) : '—'}</div>
                    </div>
                    <div>
                      <div style={{fontSize:10,color:'#555',textTransform:'uppercase',letterSpacing:'.05em'}}>Profit</div>
                      <div style={{fontSize:13,fontWeight:700,color:bundleProfit==null?'#555':bundleProfit>=0?'#4caf50':'#f44336'}}>
                        {bundleProfit==null ? '—' : `${bundleProfit>=0?'+':''}${fmt(bundleProfit)}`}
                      </div>
                    </div>
                  </div>
                </div>
              )
            }
            const item = g.item
            const profit = calcProfit(item)
            const totalP = profit != null ? profit * num(item.qty||1) : null
            const sc = STATUS_COLORS[item.status] || STATUS_COLORS['In Hand']
            const subLine = [item.sub1,item.sub2].filter(Boolean).join(' · ')
            return (
              <div key={item.id} style={{background:'#111120',border:'1px solid #1e1e2e',borderRadius:12,padding:'14px 16px'}}>
                <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:8}}>
                  <div>
                    <div style={{fontWeight:700,color:'#f0f0ff',fontSize:14,lineHeight:1.3}}>{item.name}</div>
                    {subLine && <div style={{color:'#555',fontSize:11,marginTop:3}}>{subLine}</div>}
                    {item.notes && <div style={{color:'#6366f1',fontSize:11,marginTop:3,fontStyle:'italic'}}>{item.notes}</div>}
                  </div>
                  <div style={{display:'flex',gap:6,flexShrink:0}}>
                    <button onClick={()=>openEdit(item.id)} style={{background:'transparent',border:'1px solid #2a2a3e',borderRadius:6,padding:'5px 8px',fontSize:13,cursor:'pointer'}}>✏️</button>
                    <button onClick={()=>setDeleteId(item.id)} style={{background:'transparent',border:'1px solid #2a1a1a',borderRadius:6,padding:'5px 8px',fontSize:13,cursor:'pointer'}}>🗑️</button>
                  </div>
                </div>
                <div style={{display:'flex',flexWrap:'wrap',gap:8,marginTop:10}}>
                  <span style={{background:sc.bg,color:sc.text,border:`1px solid ${sc.accent}`,borderRadius:20,padding:'3px 10px',fontSize:11,fontWeight:700,letterSpacing:'.03em'}}>{item.status}</span>
                  {item.size && <span style={{background:'#1a1a2e',border:'1px solid #2a2a3e',borderRadius:6,padding:'3px 9px',fontSize:11,fontWeight:600,color:'#8b8bcc'}}>Size {item.size}</span>}
                  {num(item.qty)>1 && <span style={{background:'#1a1a2e',border:'1px solid #2a2a3e',borderRadius:6,padding:'3px 9px',fontSize:11,fontWeight:600,color:'#8b8bcc'}}>Qty {item.qty}</span>}
                  {item.platform && <span style={{background:'#1a1a2e',border:'1px solid #2a2a3e',borderRadius:6,padding:'3px 9px',fontSize:11,fontWeight:600,color:'#8b8bcc'}}>{item.platform}</span>}
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6,marginTop:10,borderTop:'1px solid #1a1a28',paddingTop:10}}>
                  <div>
                    <div style={{fontSize:10,color:'#555',textTransform:'uppercase',letterSpacing:'.05em'}}>Buy</div>
                    <div style={{fontSize:13,fontWeight:700}}>{item.buyPrice ? fmt(item.buyPrice) : '—'}</div>
                  </div>
                  <div>
                    <div style={{fontSize:10,color:'#555',textTransform:'uppercase',letterSpacing:'.05em'}}>Sell</div>
                    <div style={{fontSize:13,fontWeight:700}}>{fmt(item.sellPrice)}</div>
                  </div>
                  <div>
                    <div style={{fontSize:10,color:'#555',textTransform:'uppercase',letterSpacing:'.05em'}}>Profit</div>
                    <div style={{fontSize:13,fontWeight:700,color: totalP==null?'#555':totalP>=0?'#4caf50':'#f44336'}}>
                      {totalP==null ? '—' : `${totalP>=0?'+':''}${fmt(totalP)}`}
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        })()}
      </div>

      {/* ── Modals ── */}
      {editItem && (
        <EditModal item={editItem} isEditing={isEditing} cat={cat} sizeOpts={getSizeOpts()}
          onSave={saveItem} onClose={closeEdit}
          onDelete={id => { closeEdit(); setDeleteId(id) }}
          onNeedSettings={() => setSettingsOpen(true)} />
      )}

      {deleteId && (
        <div onClick={e => { if(e.target===e.currentTarget) setDeleteId(null) }} style={overlayStyle}>
          <div style={sheetStyle}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'18px 20px 14px',borderBottom:'1px solid #1e1e2e'}}>
              <span style={{fontSize:16,fontWeight:800,color:'#fff'}}>Delete Item?</span>
              <button onClick={()=>setDeleteId(null)} style={{background:'transparent',border:'none',color:'#555',fontSize:20,cursor:'pointer',lineHeight:1}}>✕</button>
            </div>
            <div style={{padding:'16px 20px',color:'#aaa',fontSize:14,lineHeight:1.6}}>
              This will permanently remove this item. This can't be undone.
            </div>
            <div style={{display:'flex',justifyContent:'flex-end',gap:8,padding:'14px 20px',borderTop:'1px solid #1e1e2e'}}>
              <button onClick={()=>setDeleteId(null)} style={{background:'transparent',border:'1px solid #2a2a3e',color:'#888',borderRadius:8,padding:'9px 18px',fontSize:13,fontWeight:700,cursor:'pointer'}}>Cancel</button>
              <button onClick={deleteItem} style={{background:'linear-gradient(135deg,#ef4444,#b91c1c)',color:'#fff',border:'none',borderRadius:8,padding:'9px 22px',fontSize:13,fontWeight:700,cursor:'pointer'}}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {settingsOpen && (
        <SettingsModal
          onClose={() => setSettingsOpen(false)}
          onPush={() => pushToCloud(itemsRef.current, categoryRef.current)}
          onPull={pullFromCloud} />
      )}

      {emailPrompt && (
        <EmailPromptModal
          item={emailPrompt}
          onSend={() => { emailReceipt(emailPrompt); setEmailPrompt(null) }}
          onDismiss={() => setEmailPrompt(null)} />
      )}

      {/* ── Toast ── */}
      <div style={{position:'fixed',bottom:24,left:'50%',transform:'translateX(-50%)',background:'#1e1e3e',border:'1px solid #4a4a8e',color:'#c084fc',padding:'10px 20px',borderRadius:20,fontSize:13,fontWeight:600,opacity:toast.show?1:0,transition:'opacity .3s',pointerEvents:'none',zIndex:999,whiteSpace:'nowrap'}}>
        {toast.msg}
      </div>
    </div>
  )
}

// ── EditModal ────────────────────────────────────────────────────────────────
function EditModal({ item, isEditing, cat, sizeOpts, onSave, onClose, onDelete, onNeedSettings }) {
  const [form, setForm]       = useState({...item})
  const [scanLoading, setScanLoading] = useState(false)
  const fileInputRef = useRef(null)
  const set = (k, v) => setForm(f => ({...f, [k]: v}))
  const profit = calcProfit(form)

  async function handleScan(e) {
    const file = e.target.files[0]
    if (!file) return
    const apiKey = localStorage.getItem('rl_anthropic_key') || ''
    if (!apiKey) { onNeedSettings(); e.target.value = ''; return }

    setScanLoading(true)
    try {
      const base64 = await fileToBase64(file)
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 512,
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: file.type || 'image/jpeg', data: base64 } },
              { type: 'text', text: 'Extract purchase/resell info from this receipt or order confirmation. Return ONLY valid JSON (no markdown): {"name":"","buyPrice":"","sellPrice":"","platform":"","dateAdded":"YYYY-MM-DD","notes":"","size":"","qty":"1"}. Use empty string for unknown fields. Strip currency symbols from prices.' }
            ]
          }]
        })
      })
      if (!res.ok) throw new Error(`API ${res.status}`)
      const data = await res.json()
      const text = data?.content?.[0]?.text || ''
      const match = text.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('No JSON')
      const p = JSON.parse(match[0])
      setForm(f => ({
        ...f,
        ...(p.name      ? { name: p.name }                              : {}),
        ...(p.buyPrice  ? { buyPrice: String(p.buyPrice).replace(/[^0-9.]/g,'') }  : {}),
        ...(p.sellPrice ? { sellPrice: String(p.sellPrice).replace(/[^0-9.]/g,'') } : {}),
        ...(p.platform  ? { platform: p.platform }                      : {}),
        ...(p.dateAdded && /^\d{4}-\d{2}-\d{2}$/.test(p.dateAdded) ? { dateAdded: p.dateAdded } : {}),
        ...(p.notes     ? { notes: p.notes }                            : {}),
        ...(p.size      ? { size: p.size }                              : {}),
        ...(p.qty && Number(p.qty) > 1 ? { qty: String(p.qty) }        : {}),
      }))
    } catch {
      alert('Could not parse receipt — try a clearer image.')
    } finally {
      setScanLoading(false)
      e.target.value = ''
    }
  }

  function handleSave() {
    if (!form.name.trim()) { alert('Please enter an item name.'); return }
    onSave(form)
  }

  return (
    <div onClick={e => { if(e.target===e.currentTarget) onClose() }} style={{...overlayStyle, zIndex:200}}>
      <div style={{...sheetStyle, maxHeight:'92vh'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'18px 20px 14px',borderBottom:'1px solid #1e1e2e',flexShrink:0}}>
          <span style={{fontSize:16,fontWeight:800,color:'#fff'}}>{isEditing ? 'Edit Item' : `Add ${cat.label} Item`}</span>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <input ref={fileInputRef} type="file" accept="image/*" capture="environment"
              style={{display:'none'}} onChange={handleScan} />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={scanLoading}
              style={{background:'#1a1a2e',border:'1px solid #2a2a3e',color:scanLoading?'#555':'#8b8bcc',borderRadius:8,padding:'6px 12px',fontSize:12,fontWeight:700,cursor:scanLoading?'default':'pointer',whiteSpace:'nowrap'}}>
              {scanLoading ? '⏳ Scanning…' : '📷 Scan Receipt'}
            </button>
            <button onClick={onClose} style={{background:'transparent',border:'none',color:'#555',fontSize:20,cursor:'pointer',lineHeight:1}}>✕</button>
          </div>
        </div>

        <div style={{padding:'16px 20px',overflowY:'auto',flex:1}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px 12px',marginBottom:12}}>
            <div style={{gridColumn:'1/-1',display:'flex',flexDirection:'column',gap:4}}>
              <label style={lblStyle}>Name *</label>
              <input value={form.name} onChange={e=>set('name',e.target.value)} placeholder="Item name" style={inpStyle} />
            </div>
            <Field label={cat.sub1}><input value={form.sub1} onChange={e=>set('sub1',e.target.value)} placeholder={cat.sub1} style={inpStyle} /></Field>
            <Field label={cat.sub2}><input value={form.sub2} onChange={e=>set('sub2',e.target.value)} placeholder={cat.sub2} style={inpStyle} /></Field>
            <Field label={sizeOpts ? 'Size' : 'Size / Variant'}>
              {sizeOpts ? (
                <select value={form.size} onChange={e=>set('size',e.target.value)} style={inpStyle}>
                  <option value="">Select</option>
                  {sizeOpts.map(s=><option key={s}>{s}</option>)}
                </select>
              ) : (
                <input value={form.size} onChange={e=>set('size',e.target.value)} placeholder="Optional" style={inpStyle} />
              )}
            </Field>
            <Field label="Quantity"><input type="number" min="1" value={form.qty} onChange={e=>set('qty',e.target.value)} style={inpStyle} /></Field>
            <Field label="Status">
              <select value={form.status} onChange={e=>set('status',e.target.value)} style={inpStyle}>
                {STATUSES.map(s=><option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Buy Price (£)"><input type="number" step="0.01" value={form.buyPrice} onChange={e=>set('buyPrice',e.target.value)} placeholder="0.00" style={inpStyle} /></Field>
            <Field label="Sell Price (£)"><input type="number" step="0.01" value={form.sellPrice} onChange={e=>set('sellPrice',e.target.value)} placeholder="0.00" style={inpStyle} /></Field>
            <Field label="Platform Fee (%)"><input type="number" step="0.1" value={form.platformFee} onChange={e=>set('platformFee',e.target.value)} placeholder="e.g. 9.5" style={inpStyle} /></Field>
            <Field label="Costs (£)"><input type="number" step="0.01" value={form.shippingCost} onChange={e=>set('shippingCost',e.target.value)} placeholder="0.00" style={inpStyle} /></Field>
            <Field label="Platform">
              <select value={form.platform} onChange={e=>set('platform',e.target.value)} style={inpStyle}>
                <option value="">Select</option>
                {PLATFORMS.map(p=><option key={p}>{p}</option>)}
              </select>
            </Field>
            <Field label="Date"><input type="date" value={form.dateAdded} onChange={e=>set('dateAdded',e.target.value)} style={inpStyle} /></Field>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px 12px',marginBottom:12}}>
            <div style={{gridColumn:'1/-1',display:'flex',flexDirection:'column',gap:4}}>
              <label style={lblStyle}>Bundle ID (optional)</label>
              <div style={{display:'flex',gap:8}}>
                <input value={form.bundleId||''} onChange={e=>set('bundleId',e.target.value)}
                  placeholder="Link items sold together"
                  style={{...inpStyle, fontFamily:'monospace', fontSize:12}} />
                <button type="button" onClick={() => set('bundleId', generateId())}
                  style={{background:'#1a1a2e',border:'1px solid #2a2a3e',color:'#8b8bcc',borderRadius:7,padding:'9px 12px',fontSize:12,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap',flexShrink:0}}>
                  Generate
                </button>
              </div>
              <div style={{fontSize:11,color:'#555',marginTop:2}}>Give the same Bundle ID to items sold together as a set.</div>
            </div>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:4,marginBottom:12}}>
            <label style={lblStyle}>Notes</label>
            <textarea value={form.notes} onChange={e=>set('notes',e.target.value)} rows={2} placeholder="Any notes…" style={{...inpStyle,resize:'vertical'}} />
          </div>
          {profit != null && form.buyPrice && form.sellPrice && (
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',background:'#0a0a18',border:'1px solid #2a2a3e',borderRadius:10,padding:'12px 16px',marginTop:8}}>
              <span style={{fontSize:11,color:'#666',fontWeight:700,letterSpacing:'.06em',textTransform:'uppercase'}}>Est. Profit / unit</span>
              <span style={{fontSize:18,fontWeight:800,color:profit>=0?'#4caf50':'#f44336'}}>{profit>=0?'+':''}{fmt(profit)}</span>
            </div>
          )}
        </div>

        <div style={{display:'flex',justifyContent:'flex-end',gap:8,padding:'14px 20px',borderTop:'1px solid #1e1e2e',flexShrink:0,alignItems:'center'}}>
          {isEditing && (
            <button onClick={()=>onDelete(form.id)} style={{background:'transparent',border:'1px solid #4a1a1a',color:'#f44',borderRadius:8,padding:'9px 18px',fontSize:13,fontWeight:700,cursor:'pointer',marginRight:'auto'}}>Delete Item</button>
          )}
          <button onClick={onClose} style={{background:'transparent',border:'1px solid #2a2a3e',color:'#888',borderRadius:8,padding:'9px 18px',fontSize:13,fontWeight:700,cursor:'pointer'}}>Cancel</button>
          <button onClick={handleSave} style={{background:'linear-gradient(135deg,#6366f1,#8b5cf6)',color:'#fff',border:'none',borderRadius:8,padding:'9px 22px',fontSize:13,fontWeight:700,cursor:'pointer'}}>
            {isEditing ? 'Save Changes' : 'Add Item'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── SettingsModal ─────────────────────────────────────────────────────────────
function SettingsModal({ onClose, onPush, onPull }) {
  const [apiKey,  setApiKey]  = useState(localStorage.getItem('rl_anthropic_key') || '')
  const [email,   setEmail]   = useState(localStorage.getItem('rl_email') || '')
  const [syncId,  setSyncId]  = useState(localStorage.getItem('rl_sync_id') || '')
  const [syncMsg, setSyncMsg] = useState('')

  function handleSave() {
    localStorage.setItem('rl_anthropic_key', apiKey.trim())
    localStorage.setItem('rl_email', email.trim())
    const prevSyncId = localStorage.getItem('rl_sync_id') || ''
    localStorage.setItem('rl_sync_id', syncId.trim())
    if (syncId.trim() !== prevSyncId) {
      window.location.reload()
    } else {
      onClose()
    }
  }

  async function handleAction(fn, label) {
    setSyncMsg(label + '…')
    try {
      await fn()
      setSyncMsg(label === 'Pulling' ? 'Pulled!' : 'Pushed!')
    } catch(e) {
      setSyncMsg('Error: ' + (e?.code || e?.message || 'unknown'))
    }
    setTimeout(() => setSyncMsg(''), 6000)
  }

  return (
    <div onClick={e => { if(e.target===e.currentTarget) onClose() }} style={{...overlayStyle, zIndex:210}}>
      <div style={{...sheetStyle, maxHeight:'92vh'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'18px 20px 14px',borderBottom:'1px solid #1e1e2e',flexShrink:0}}>
          <span style={{fontSize:16,fontWeight:800,color:'#fff'}}>Settings</span>
          <button onClick={onClose} style={{background:'transparent',border:'none',color:'#555',fontSize:20,cursor:'pointer',lineHeight:1}}>✕</button>
        </div>
        <div style={{padding:'20px',display:'flex',flexDirection:'column',gap:16,overflowY:'auto',flex:1}}>
          <Field label="Anthropic API Key (for Receipt Scanner)">
            <input type="password" value={apiKey} onChange={e=>setApiKey(e.target.value)}
              placeholder="sk-ant-…" style={inpStyle} autoComplete="off" />
            <div style={{fontSize:11,color:'#555',marginTop:4}}>Stored locally on your device only. Used to scan receipts with AI.</div>
          </Field>
          <Field label="Your Email (for Receipt Emails)">
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
              placeholder="you@example.com" style={inpStyle} />
            <div style={{fontSize:11,color:'#555',marginTop:4}}>When you log a sale, we'll prompt you to email yourself a receipt.</div>
          </Field>

          <div style={{borderTop:'1px solid #1e1e2e',paddingTop:16}}>
            <div style={{fontSize:12,fontWeight:700,color:'#8b8bcc',marginBottom:8,letterSpacing:'.05em',textTransform:'uppercase'}}>Cloud Sync</div>
            <div style={{fontSize:12,color:'#555',marginBottom:12,lineHeight:1.6}}>
              Sync your data across all devices in real time. Generate a Sync ID on one device, then enter the same ID on your other devices.
            </div>
            <div style={{fontSize:12,background:'#1a1a0a',border:'1px solid #4a3a00',borderRadius:8,padding:'10px 12px',marginBottom:12,color:'#aaa',lineHeight:1.7}}>
              <span style={{color:'#f59e0b',fontWeight:700}}>⚠ Firestore rules must allow access.</span><br/>
              In Firebase Console → Firestore → Rules, set:<br/>
              <span style={{fontFamily:'monospace',color:'#8b8bcc',fontSize:11}}>allow read, write: if true;</span>
            </div>
            <Field label="Sync ID">
              <div style={{display:'flex',gap:8}}>
                <input value={syncId} onChange={e=>setSyncId(e.target.value)}
                  placeholder="Generate or paste your sync key"
                  style={{...inpStyle, fontFamily:'monospace', fontSize:12}} />
                <button onClick={() => setSyncId(generateId())}
                  style={{background:'#1a1a2e',border:'1px solid #2a2a3e',color:'#8b8bcc',borderRadius:7,padding:'9px 12px',fontSize:12,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap',flexShrink:0}}>
                  Generate
                </button>
              </div>
              <div style={{fontSize:11,color:'#555',marginTop:4}}>Use the same Sync ID on every device. Keep it private — anyone with this ID can read your data.</div>
            </Field>
            {syncId && (
              <div style={{display:'flex',gap:8,marginTop:10}}>
                <button onClick={() => handleAction(onPull, 'Pulling')}
                  style={{flex:1,background:'#1a1a2e',border:'1px solid #4a9eff',color:'#4a9eff',borderRadius:8,padding:'9px 12px',fontSize:13,fontWeight:700,cursor:'pointer'}}>
                  ⬇ Pull from Cloud
                </button>
                <button onClick={() => handleAction(onPush, 'Pushing')}
                  style={{flex:1,background:'#1a2a1a',border:'1px solid #4caf50',color:'#4caf50',borderRadius:8,padding:'9px 12px',fontSize:13,fontWeight:700,cursor:'pointer'}}>
                  ⬆ Push to Cloud
                </button>
              </div>
            )}
            {syncMsg && (
              <div style={{marginTop:8,fontSize:12,color:syncMsg.startsWith('Error')?'#f44336':'#4caf50',textAlign:'center',wordBreak:'break-all'}}>{syncMsg}</div>
            )}
          </div>
        </div>
        <div style={{display:'flex',justifyContent:'flex-end',gap:8,padding:'14px 20px',borderTop:'1px solid #1e1e2e',flexShrink:0}}>
          <button onClick={onClose} style={{background:'transparent',border:'1px solid #2a2a3e',color:'#888',borderRadius:8,padding:'9px 18px',fontSize:13,fontWeight:700,cursor:'pointer'}}>Cancel</button>
          <button onClick={handleSave} style={{background:'linear-gradient(135deg,#6366f1,#8b5cf6)',color:'#fff',border:'none',borderRadius:8,padding:'9px 22px',fontSize:13,fontWeight:700,cursor:'pointer'}}>Save</button>
        </div>
      </div>
    </div>
  )
}

// ── EmailPromptModal ──────────────────────────────────────────────────────────
function EmailPromptModal({ item, onSend, onDismiss }) {
  const userEmail = localStorage.getItem('rl_email') || ''
  return (
    <div onClick={e => { if(e.target===e.currentTarget) onDismiss() }} style={{...overlayStyle, zIndex:220}}>
      <div style={sheetStyle}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'18px 20px 14px',borderBottom:'1px solid #1e1e2e'}}>
          <span style={{fontSize:16,fontWeight:800,color:'#fff'}}>✉️ Send Receipt?</span>
          <button onClick={onDismiss} style={{background:'transparent',border:'none',color:'#555',fontSize:20,cursor:'pointer',lineHeight:1}}>✕</button>
        </div>
        <div style={{padding:'16px 20px',color:'#aaa',fontSize:14,lineHeight:1.6}}>
          Send an email receipt for <span style={{color:'#fff',fontWeight:700}}>{item.name}</span> to <span style={{color:'#6366f1'}}>{userEmail}</span>?
        </div>
        <div style={{display:'flex',justifyContent:'flex-end',gap:8,padding:'14px 20px',borderTop:'1px solid #1e1e2e'}}>
          <button onClick={onDismiss} style={{background:'transparent',border:'1px solid #2a2a3e',color:'#888',borderRadius:8,padding:'9px 18px',fontSize:13,fontWeight:700,cursor:'pointer'}}>Skip</button>
          <button onClick={onSend} style={{background:'linear-gradient(135deg,#6366f1,#8b5cf6)',color:'#fff',border:'none',borderRadius:8,padding:'9px 22px',fontSize:13,fontWeight:700,cursor:'pointer'}}>Send Receipt ✉️</button>
        </div>
      </div>
    </div>
  )
}

// ── Field ─────────────────────────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div style={{display:'flex',flexDirection:'column',gap:4}}>
      <label style={lblStyle}>{label}</label>
      {children}
    </div>
  )
}
