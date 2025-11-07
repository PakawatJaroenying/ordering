import React, { useState, useRef } from "react";
import { PRODUCTS } from "./lib/products";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverTrigger,
	PopoverContent,
} from "@/components/ui/popover";
import {
	Command,
	CommandInput,
	CommandList,
	CommandItem,
	CommandEmpty,
} from "@/components/ui/command";

type OrderItem = {
	quantity: number;
	time: string;
};

type OrdersMap = Record<string, OrderItem[]>;

function App() {
	const [product, setProduct] = useState("");
	const [quantity, setQuantity] = useState<number | null>(null);
	const [orders, setOrders] = useState<OrdersMap>({});
	const [lastAdded, setLastAdded] = useState<{
		name: string;
		idx: number;
	} | null>(null);

	const [open, setOpen] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);
	const commandInputRef = useRef<HTMLInputElement>(null);

	// Add or update order
	const handleAddOrder = () => {
		const trimmed = product.trim();
		if (!trimmed || (quantity && quantity <= 0)) return;
		if (!PRODUCTS.some((item) => item.name.toString() === trimmed)) {
			alert("สินค้านี้ไม่มีอยู่ในรายการ");
			return;
		}

		const newOrder: OrderItem = {
			quantity: quantity || 0,
			time: new Date().toLocaleTimeString(),
		};

		setOrders((prev) => ({
			...prev,
			[trimmed]: [...(prev[trimmed] || []), newOrder],
		}));

		setLastAdded({ name: trimmed, idx: orders[trimmed]?.length || 0 });

		setProduct("");
		setQuantity(null);
		setOpen(true); // เปิด popover ทันที
		setTimeout(() => {
			commandInputRef.current?.focus();
		}, 100);
	};

	const hanedleDeleteOrder = () => {
		const isConfirm = window.confirm("คุณแน่ใจหรือว่าต้องการลบรายการนี้?");
		if (!isConfirm) return;
		const trimmed = product.trim();
		if (!trimmed || (quantity && quantity <= 0)) return;
		if (!PRODUCTS.some((item) => item.name.toString() === trimmed)) {
			alert("สินค้านี้ไม่มีอยู่ในรายการ");
			return;
		}
		setOrders((prev) => {
			const existingItems = prev[trimmed] || [];
			const qtyToDelete = quantity || 0;
			let qtyLeftToDelete = qtyToDelete;
			const updatedItems: OrderItem[] = [];
			for (let i = 0; i < existingItems.length; i++) {
				const item = existingItems[i];
				if (qtyLeftToDelete <= 0) {
					updatedItems.push(item);
				} else if (item.quantity <= qtyLeftToDelete) {
					qtyLeftToDelete -= item.quantity;
				} else {
					updatedItems.push({
						quantity: item.quantity - qtyLeftToDelete,
						time: item.time,
					});
					qtyLeftToDelete = 0;
				}
			}
			const newOrders = { ...prev };
			if (updatedItems.length > 0) {
				newOrders[trimmed] = updatedItems;
			} else {
				delete newOrders[trimmed];
			}
			return newOrders;
		});

		setProduct("");
		setQuantity(null);
		setOpen(true);
		setTimeout(() => {
			commandInputRef.current?.focus();
		}, 100);
	};

	// Handle Enter key for quantity input
	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") {
			handleAddOrder();
		}
	};

	// ฟังก์ชันสุ่มสีพาสเทลจาก string (เช่น เวลา)
	function getPastelColorClass(seed: string) {
		const colorSets = [
			{ bg: "bg-pink-50", border: "border-pink-200", text: "text-pink-700" },
			{
				bg: "bg-purple-50",
				border: "border-purple-200",
				text: "text-purple-700",
			},
			{ bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700" },
			{ bg: "bg-green-50", border: "border-green-200", text: "text-green-700" },
			{
				bg: "bg-yellow-50",
				border: "border-yellow-200",
				text: "text-yellow-800",
			},
			{
				bg: "bg-orange-50",
				border: "border-orange-200",
				text: "text-orange-700",
			},
			{ bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-700" },
			{ bg: "bg-teal-50", border: "border-teal-200", text: "text-teal-700" },
		];
		let hash = 0;
		for (let i = 0; i < seed.length; i++) {
			hash = seed.charCodeAt(i) + ((hash << 5) - hash);
		}
		const idx = Math.abs(hash) % colorSets.length;
		return colorSets[idx];
	}

	// โหลด orders จาก localStorage ตอน mount
	React.useEffect(() => {
		const saved = localStorage.getItem("orders");
		if (saved) {
			try {
				setOrders(JSON.parse(saved));
			} catch {
				console.error("Failed to parse orders from localStorage");
			}
		}
	}, []);

	// บันทึก orders ลง localStorage ทุกครั้งที่ orders เปลี่ยน
	React.useEffect(() => {
		if (Object.keys(orders).length === 0) {
			localStorage.removeItem("orders");
			return;
		}
		localStorage.setItem("orders", JSON.stringify(orders));
	}, [orders]);

	// ฟังก์ชัน export ข้อมูลเป็น .txt
	function handleExportTxt() {
		const lines: string[] = [];
		Object.entries(orders).forEach(([name, items]) => {
			const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);
			lines.push(`${name} ${totalQty}`);
		});
		// ใส่ BOM และกำหนด charset เพื่อให้ iOS/บางแอปอ่านภาษาไทยได้ถูกต้อง
		const content = "\uFEFF" + lines.join("\r\n");
		// ตั้งชื่อไฟล์เป็น วันที่-เดือน-ปี_เวลา (dd-MM-yyyy_HH-mm-ss)
		const now = new Date();
		const pad = (n: number) => String(n).padStart(2, "0");
		const fileName = `${pad(now.getDate())}-${pad(
			now.getMonth() + 1
		)}-${now.getFullYear()}_${pad(now.getHours())}-${pad(
			now.getMinutes()
		)}-${pad(now.getSeconds())}.txt`;
		const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = fileName;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	// ฟังก์ชันลบข้อมูลทั้งหมด
	function handleClearOrders() {
		if (confirm("คุณแน่ใจหรือว่าต้องการลบข้อมูลทั้งหมด?")) {
			setOrders({});
			localStorage.removeItem("orders");
			setLastAdded(null);
		}
	}

	return (
		<div className="min-h-screen bg-gray-100 flex items-center justify-center py-8">
			<div className="max-w-md w-full mx-auto p-6 bg-white rounded-2xl shadow-xl border border-gray-200">
				<img
					src={`${import.meta.env.BASE_URL}S__176734217.jpg`}
					alt="โลโก้ร้าน"
					className="mx-auto mb-4 h-20 w-20 object-cover rounded-full border border-pink-200 shadow"
				/>
				<h1 className="text-2xl font-extrabold mb-6 flex items-center gap-2 text-pink-700">
					<span
						role="img"
						aria-label="order"
					>
						🧾
					</span>{" "}
					Order Aggregator
				</h1>

				{lastAdded &&
					(() => {
						const lastOrder = orders[lastAdded.name]?.[lastAdded.idx];
						const color = lastOrder
							? getPastelColorClass(lastOrder.time)
							: getPastelColorClass("default");
						return (
							<div
								className={`my-4 rounded-lg shadow p-3 text-sm font-semibold flex items-center gap-2 border ${color.bg} ${color.border} ${color.text}`}
							>
								{lastAdded.name} {lastOrder?.quantity || 0}
							</div>
						);
					})()}
				<div className="flex gap-2 mb-4 relative w-full">
					<Popover
						open={open}
						onOpenChange={setOpen}
					>
						<PopoverTrigger asChild>
							<Button
								variant="outline"
								className="w-[220px] justify-start text-left font-normal bg-gray-50 border-gray-300 rounded-lg shadow-sm hover:bg-gray-100"
								type="button"
							>
								{product || "เลือกหรือค้นหาสินค้า..."}
							</Button>
						</PopoverTrigger>
						<PopoverContent className="p-0 w-[260px]">
							<Command>
								<CommandInput
									ref={commandInputRef}
									placeholder="ค้นหาสินค้า..."
									value={product}
									onValueChange={setProduct}
									autoFocus
								/>
								<CommandList>
									<CommandEmpty>ไม่พบสินค้า</CommandEmpty>
									{PRODUCTS.filter((item) =>
										item.name.toLowerCase().includes(product.toLowerCase())
									).map((item) => (
										<CommandItem
											key={item.id}
											onSelect={() => {
												setProduct(item.name);
												setOpen(false);
												setTimeout(() => inputRef.current?.focus(), 100);
											}}
										>
											{item.name}
										</CommandItem>
									))}
								</CommandList>
							</Command>
						</PopoverContent>
					</Popover>

					<div className="w-full">
						<Input
							ref={inputRef}
							type="number"
							min={1}
							value={quantity || ""}
							onChange={(e) => setQuantity(Number(e.target.value))}
							onKeyDown={handleKeyDown}
							className="rounded-lg border-gray-300 shadow-sm focus:ring-pink-200"
						/>
					</div>
				</div>
				<div className="flex w-full items-center justify-between gap-4">
					<Button
						className="flex-1 bg-pink-500 hover:bg-pink-600 text-white font-semibold rounded-lg shadow-sm px-4"
						disabled={
							!PRODUCTS.some(
								(item) => item.name.toString() === product.trim()
							) ||
							quantity === null ||
							quantity <= 0
						}
						onClick={handleAddOrder}
					>
						เพิ่ม
					</Button>
					<Button
						className="flex-1 bg-gray-400 hover:bg-gray-500 text-white font-semibold rounded-lg shadow-sm px-4"
						disabled={
							!PRODUCTS.some(
								(item) => item.name.toString() === product.trim()
							) ||
							quantity === null ||
							quantity <= 0
						}
						onClick={hanedleDeleteOrder}
					>
						ลบ
					</Button>
				</div>
				<div className="mt-4 flex items-center justify-between">
					<h2 className="font-semibold mb-3 text-lg text-gray-700 flex items-center gap-2">
						<span
							role="img"
							aria-label="list"
						>
							📋
						</span>{" "}
						รายการสั่งซื้อ
					</h2>
					<div className="flex gap-2">
						<Button
							onClick={handleExportTxt}
							variant="outline"
							className="text-pink-700 border-pink-300 hover:bg-pink-50 px-3 py-1 text-sm"
						>
							Export to .txt
						</Button>
						<Button
							onClick={handleClearOrders}
							variant="outline"
							className="text-gray-500 border-gray-300 hover:bg-gray-100 px-3 py-1 text-sm"
						>
							Clear
						</Button>
					</div>
				</div>
				<div className="mt-4">
					{Object.keys(orders).length === 0 ? (
						<div className="text-gray-400 text-center py-8">ยังไม่มีรายการ</div>
					) : (
						<div className="mt-2">
							<ul className="space-y-4">
								{Object.entries(orders).map(([name, items]) => {
									const productObj = PRODUCTS.find((p) => p.name === name);
									const totalQty = items.reduce(
										(total, item) => total + item.quantity,
										0
									);
									const totalPrice = productObj
										? totalQty * productObj.price
										: 0;
									return (
										<li
											key={name}
											className="bg-white rounded-xl shadow border border-gray-200 p-3"
										>
											<div className="flex items-center justify-between mb-1">
												<div className="font-semibold text-base text-pink-700">
													{name}
												</div>
												{productObj && (
													<span className="text-xs text-gray-500">{`ราคา/ชิ้น: ${productObj.price} บาท`}</span>
												)}
											</div>
											<ul className="pl-2 mb-2">
												{items.map((item, idx) => {
													const isLast =
														lastAdded?.name === name && lastAdded.idx === idx;
													return (
														<li
															key={idx}
															className={`flex justify-between items-center px-2 py-1 rounded text-sm ${
																isLast ? "bg-yellow-100 font-bold" : ""
															}`}
														>
															<span>จำนวน: {item.quantity}</span>
															<span className="text-gray-400">{item.time}</span>
														</li>
													);
												})}
											</ul>
											<div className="flex items-center justify-between px-2 py-1 bg-gray-50 rounded border-t border-gray-200">
												<span className="text-gray-600 text-sm">
													รวม {totalQty} ชิ้น
												</span>
												<span className="text-gray-800 font-bold">
													{totalPrice} บาท
												</span>
											</div>
										</li>
									);
								})}
							</ul>
						</div>
					)}
				</div>
				{/* ชิ้น */}
				<div className="mt-6 text-right font-semibold text-lg text-gray-700">
					{(() => {
						let totalQuantity = 0;
						Object.values(orders).forEach((items) => {
							totalQuantity += items.reduce(
								(sum, item) => sum + item.quantity,
								0
							);
						});
						return `รวมทั้งหมด: ${totalQuantity} ชิ้น`;
					})()}
				</div>
				{/* รวมราคาทั้งหมด */}
				<div className="mt-2 text-right font-bold text-xl border-t pt-4 border-gray-300 text-pink-700">
					{(() => {
						let total = 0;
						Object.entries(orders).forEach(([name, items]) => {
							const productObj = PRODUCTS.find((p) => p.name === name);
							if (productObj) {
								total += items.reduce(
									(sum, item) => sum + item.quantity * productObj.price,
									0
								);
							}
						});
						return `รวมทั้งหมด: ${total} บาท`;
					})()}
				</div>
			</div>
		</div>
	);
}

export default App;
