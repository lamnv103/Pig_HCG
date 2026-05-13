import React, { useMemo, useState } from 'react';

const VET_LOCATIONS = [
  {
    id: 'hai-chau',
    name: 'Trạm Thú Y Hải Châu',
    doctor: 'BS. Nguyễn Minh Khánh',
    address: '74 Trần Phú, Hải Châu, Đà Nẵng',
    phone: '0905 123 001',
    tel: '0905123001',
    type: 'Trạm thú y',
    distance: '2.4 km',
    lat: 16.0669,
    lng: 108.2196,
    icon: '🏥',
    accent: 'bg-blue-100 text-blue-700',
  },
  {
    id: 'thanh-khe',
    name: 'Phòng Khám Thú Y Thanh Khê',
    doctor: 'BS. Trần Thị Mai',
    address: '155 Điện Biên Phủ, Thanh Khê, Đà Nẵng',
    phone: '0914 665 020',
    tel: '0914665020',
    type: 'Phòng khám tư nhân',
    distance: '4.8 km',
    lat: 16.0758,
    lng: 108.2025,
    icon: '💊',
    accent: 'bg-purple-100 text-purple-700',
  },
  {
    id: 'hoa-vang',
    name: 'Trạm Khuyến Nông Hòa Vang',
    doctor: 'KS. Lê Văn Phúc',
    address: 'Hòa Phong, Hòa Vang, Đà Nẵng',
    phone: '0932 410 118',
    tel: '0932410118',
    type: 'Khuyến nông',
    distance: '16.5 km',
    lat: 15.98,
    lng: 108.12,
    icon: '🌾',
    accent: 'bg-amber-100 text-amber-700',
  },
  {
    id: 'lien-chieu',
    name: 'Cửa Hàng Thuốc Thú Y An Phú',
    doctor: 'DS. Phạm Quốc An',
    address: '287 Tôn Đức Thắng, Liên Chiểu, Đà Nẵng',
    phone: '0905 882 119',
    tel: '0905882119',
    type: 'Thuốc thú y',
    distance: '9.1 km',
    lat: 16.105,
    lng: 108.154,
    icon: '🏪',
    accent: 'bg-orange-100 text-orange-700',
  },
  {
    id: 'hoi-an',
    name: 'Phòng Khám Thú Y Hội An',
    doctor: 'BS. Võ Hoài Nam',
    address: '15 Phan Châu Trinh, Hội An, Quảng Nam',
    phone: '0901 737 225',
    tel: '0901737225',
    type: 'Phòng khám tư nhân',
    distance: '28.3 km',
    lat: 15.88,
    lng: 108.335,
    icon: '💊',
    accent: 'bg-purple-100 text-purple-700',
  },
];

export default function VetMapPage() {
  const [selectedId, setSelectedId] = useState(VET_LOCATIONS[0].id);
  const selectedLocation = VET_LOCATIONS.find((location) => location.id === selectedId) || VET_LOCATIONS[0];

  const mapUrl = useMemo(() => {
    const query = encodeURIComponent(`${selectedLocation.lat},${selectedLocation.lng}`);
    return `https://www.google.com/maps?q=${query}&z=14&output=embed`;
  }, [selectedLocation]);

  return (
    <div className="grid min-h-[calc(100vh-130px)] gap-5 animate-fade-in lg:grid-cols-[360px_1fr]">
      <section className="flex flex-col gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-extrabold text-slate-900">
            <span>📍</span> Bản Đồ Thú Y
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Các điểm hỗ trợ thú y demo tại Đà Nẵng và miền Trung.
          </p>
        </div>

        <div className="space-y-3">
          {VET_LOCATIONS.map((location) => {
            const isSelected = location.id === selectedId;
            return (
              <button
                key={location.id}
                type="button"
                onClick={() => setSelectedId(location.id)}
                className={`w-full rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50/40 ${
                  isSelected ? 'border-emerald-300 ring-4 ring-emerald-100' : 'border-slate-100'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-xl">
                    {location.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${location.accent}`}>
                        {location.type}
                      </span>
                      <span className="text-[11px] font-bold text-slate-400">{location.distance}</span>
                    </div>
                    <p className="truncate text-sm font-extrabold text-slate-800">{location.name}</p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">{location.address}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="relative min-h-[540px] overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 shadow-md">
        <iframe
          key={selectedLocation.id}
          title={`Google Maps - ${selectedLocation.name}`}
          src={mapUrl}
          className="h-full min-h-[540px] w-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />

        <div className="absolute inset-x-4 bottom-4 animate-slide-up rounded-3xl border border-slate-100 bg-white/95 p-4 shadow-2xl backdrop-blur md:inset-x-6 md:bottom-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${selectedLocation.accent}`}>
                  {selectedLocation.icon} {selectedLocation.type}
                </span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                  {selectedLocation.distance}
                </span>
              </div>
              <h3 className="truncate text-lg font-extrabold text-slate-900">{selectedLocation.name}</h3>
              <p className="mt-1 text-sm font-semibold text-slate-600">{selectedLocation.doctor}</p>
              <p className="mt-1 text-xs text-slate-500">{selectedLocation.address}</p>
            </div>
            <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
              <a
                href={`tel:${selectedLocation.tel}`}
                className="rounded-2xl bg-rose-500 px-5 py-3 text-center text-sm font-extrabold text-white shadow-lg shadow-rose-500/20 hover:bg-rose-600"
              >
                Gọi điện thoại khẩn cấp
              </a>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${selectedLocation.lat},${selectedLocation.lng}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-center text-sm font-extrabold text-slate-700 hover:bg-slate-50"
              >
                Mở Google Maps
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
