
import React, { useState, useRef } from 'react';
import { useLanguage } from './LanguageContext.tsx';

const DownloadIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
);

const RefreshIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
);

const ClearProjectButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
    <div className="w-full flex justify-end mb-4">
        <button onClick={onClick} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-red-300 bg-red-900/40 border border-red-800 rounded-lg hover:bg-red-900/80 transition-colors duration-200">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            Clear Project
        </button>
    </div>
);

const StudentIdCardGenerator: React.FC = () => {
    const { t } = useLanguage();
    const [formData, setFormData] = useState({
        universityName: 'UNIVERSITAS NEGERI PADANG',
        ministryName: 'KEMENTERIAN RISET, TEKNOLOGI DAN PENDIDIKAN TINGGI',
        cardTitle: 'KARTU MAHASISWA SEMENTARA',
        studentName: 'SITI NURHAYATI',
        nim: '2026/20001286',
        selectionNo: '004351709688',
        programLevel: 'Strata 2',
        studyProgram: 'Pendidikan Bahasa dan Sastra Indonesia (S2)',
        entryStatus: 'Seleksi UNP',
        dateCity: 'Padang',
        date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).replace(/ /g, ''),
        signerName: 'Murni Sukmawati, S.Kom, M.Pd.',
        signerNip: '197104261999032002'
    });

    const [photo, setPhoto] = useState<string | null>(null);
    const [logo, setLogo] = useState<string | null>(null);
    const cardRef = useRef<HTMLDivElement>(null);
    const [autoGenerate, setAutoGenerate] = useState(false);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleImageUpload = (setter: React.Dispatch<React.SetStateAction<string | null>>) => (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setter(url);
        }
    };

    const generateRandomData = () => {
        const names = ["SITI NURHAYATI", "AHMAD HIDAYAT", "DEWI PUSPITA", "EKO PRASETYO", "RINA MELATI", "BUDI SANTOSO", "LINA MARLINA", "RIZKY RAMADHAN"];
        const programs = [
            "Pendidikan Bahasa dan Sastra Indonesia (S2)", 
            "Manajemen Pendidikan (S2)", 
            "Teknik Informatika (S1)", 
            "Ilmu Hukum (S1)",
            "Administrasi Pendidikan (S2)",
            "Bimbingan dan Konseling (S2)"
        ];
        const cities = ["Padang", "Jakarta", "Bandung", "Surabaya", "Medan", "Palembang"];
        const statuses = ["Seleksi UNP", "SNMPTN", "SBMPTN", "Mandiri"];

        const randomName = names[Math.floor(Math.random() * names.length)];
        const randomProgram = programs[Math.floor(Math.random() * programs.length)];
        const randomCity = cities[Math.floor(Math.random() * cities.length)];
        const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
        
        const randomNIM = `2026/${Math.floor(20000000 + Math.random() * 900000)}`;
        const randomSel = `00${Math.floor(4000000000 + Math.random() * 900000000)}`;
        
        const randomDate = new Date();
        randomDate.setDate(randomDate.getDate() - Math.floor(Math.random() * 30));
        const dateStr = randomDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).replace(/ /g, '');

        setFormData(prev => ({
            ...prev,
            studentName: randomName,
            nim: randomNIM,
            selectionNo: randomSel,
            studyProgram: randomProgram,
            entryStatus: randomStatus,
            dateCity: randomCity,
            date: dateStr
        }));

        if (autoGenerate) {
            const gender = Math.random() > 0.5 ? 'women' : 'men';
            const id = Math.floor(Math.random() * 70);
            setPhoto(`https://randomuser.me/api/portraits/${gender}/${id}.jpg`);
            setLogo('https://cdn-icons-png.flaticon.com/512/2963/2963278.png'); 
        }
    };

    const handleDownload = async () => {
        if (!cardRef.current || !(window as any).html2canvas) return;
        try {
            // Use html2canvas with specific settings for better image capture
            const canvas = await (window as any).html2canvas(cardRef.current, {
                scale: 3, // Higher resolution
                backgroundColor: '#ffffff',
                useCORS: true, // Critical for external images
                allowTaint: true, // Allow tainted images (local blobs)
                logging: false,
            });
            const link = document.createElement('a');
            link.download = `Student_ID_${formData.nim.replace('/', '-')}.png`;
            link.href = canvas.toDataURL('image/png', 1.0);
            link.click();
        } catch (error) {
            console.error("Download failed", error);
            alert("Failed to generate image. Please try again.");
        }
    };

    const handleClear = () => {
        setFormData({
             universityName: 'UNIVERSITAS NEGERI PADANG',
             ministryName: 'KEMENTERIAN RISET, TEKNOLOGI DAN PENDIDIKAN TINGGI',
             cardTitle: 'KARTU MAHASISWA SEMENTARA',
             studentName: '',
             nim: '',
             selectionNo: '',
             programLevel: '',
             studyProgram: '',
             entryStatus: '',
             dateCity: '',
             date: '',
             signerName: 'Murni Sukmawati, S.Kom, M.Pd.',
             signerNip: '197104261999032002'
        });
        setPhoto(null);
        setLogo(null);
        setAutoGenerate(false);
    };

    const inputClass = "w-full bg-gray-700 border border-gray-600 text-white text-sm rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none";

    return (
        <div className="w-full max-w-7xl mx-auto p-4">
            <ClearProjectButton onClick={handleClear} />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left: Form */}
                <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700 h-fit space-y-4">
                    <div className="flex justify-between items-center mb-4">
                         <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <span>🆔</span> Student ID Settings
                        </h2>
                         <label className="flex items-center gap-2 cursor-pointer bg-gray-900 p-2 rounded border border-purple-500/30 hover:border-purple-500">
                            <input type="checkbox" checked={autoGenerate} onChange={e => setAutoGenerate(e.target.checked)} className="text-purple-500 focus:ring-purple-500"/> 
                            <span className="text-xs text-gray-300">Auto Generate Data</span>
                        </label>
                    </div>
                    
                    <div className="flex justify-end mb-4">
                        <button 
                            onClick={generateRandomData}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold rounded-lg shadow-md transition w-full justify-center"
                        >
                            <RefreshIcon /> Generate
                        </button>
                    </div>

                    {!autoGenerate && (
                        <div className="grid grid-cols-2 gap-4 mb-4 p-3 bg-gray-900/50 rounded-lg border border-gray-700">
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Upload Photo (3x4)</label>
                                <label className="flex flex-col items-center justify-center w-full h-24 cursor-pointer bg-gray-800 hover:bg-gray-700 border-2 border-dashed border-gray-600 rounded-lg transition-colors overflow-hidden">
                                    {photo ? <img src={photo} className="h-full w-full object-contain" alt="Photo"/> : <span className="text-xs text-gray-500">Select Photo</span>}
                                    <input type="file" accept="image/*" onChange={handleImageUpload(setPhoto)} className="hidden" />
                                </label>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Upload Logo</label>
                                <label className="flex flex-col items-center justify-center w-full h-24 cursor-pointer bg-gray-800 hover:bg-gray-700 border-2 border-dashed border-gray-600 rounded-lg transition-colors overflow-hidden">
                                    {logo ? <img src={logo} className="h-full w-full object-contain" alt="Logo"/> : <span className="text-xs text-gray-500">Select Logo</span>}
                                    <input type="file" accept="image/*" onChange={handleImageUpload(setLogo)} className="hidden" />
                                </label>
                            </div>
                        </div>
                    )}

                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Full Name</label>
                            <input type="text" name="studentName" value={formData.studentName} onChange={handleInputChange} className={inputClass} placeholder="SITI NURHAYATI" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">NIM / Year</label>
                                <input type="text" name="nim" value={formData.nim} onChange={handleInputChange} className={inputClass} placeholder="2026/20001286" />
                            </div>
                             <div>
                                <label className="block text-xs text-gray-400 mb-1">Selection No.</label>
                                <input type="text" name="selectionNo" value={formData.selectionNo} onChange={handleInputChange} className={inputClass} placeholder="004351709688" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Program Level</label>
                            <input type="text" name="programLevel" value={formData.programLevel} onChange={handleInputChange} className={inputClass} placeholder="Strata 2" />
                        </div>
                         <div>
                            <label className="block text-xs text-gray-400 mb-1">Study Program</label>
                            <input type="text" name="studyProgram" value={formData.studyProgram} onChange={handleInputChange} className={inputClass} placeholder="Pendidikan Bahasa..." />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Entry Status</label>
                            <input type="text" name="entryStatus" value={formData.entryStatus} onChange={handleInputChange} className={inputClass} placeholder="Seleksi UNP" />
                        </div>
                         <div className="grid grid-cols-2 gap-3">
                             <div>
                                <label className="block text-xs text-gray-400 mb-1">City</label>
                                <input type="text" name="dateCity" value={formData.dateCity} onChange={handleInputChange} className={inputClass} placeholder="Padang" />
                            </div>
                             <div>
                                <label className="block text-xs text-gray-400 mb-1">Date</label>
                                <input type="text" name="date" value={formData.date} onChange={handleInputChange} className={inputClass} placeholder="26Jan2025" />
                            </div>
                        </div>
                    </div>

                    <button 
                        onClick={handleDownload}
                        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow-lg transition transform active:scale-95 mt-4"
                    >
                        <DownloadIcon /> Download ID Card
                    </button>
                </div>

                {/* Right: Preview */}
                <div className="flex justify-center items-start bg-gray-900 p-8 rounded-xl border border-gray-700 overflow-auto">
                    <div 
                        ref={cardRef} 
                        className="bg-white text-black p-8 shadow-2xl relative"
                        style={{ width: '650px', minWidth: '650px', minHeight: '450px', fontFamily: 'Arial, sans-serif' }}
                    >
                        {/* Header */}
                        <div className="flex items-start justify-center border-b-2 border-black pb-4 mb-6">
                            <div className="w-24 h-24 mr-4 flex items-center justify-center">
                                {logo ? (
                                    <img src={logo} alt="Logo" className="w-full h-full object-contain" crossOrigin="anonymous" />
                                ) : (
                                    <div className="w-full h-full bg-gray-200 rounded-full flex items-center justify-center text-[10px] text-gray-500 border border-gray-300 font-bold p-2 text-center">LOGO HERE</div>
                                )}
                            </div>
                            <div className="text-center">
                                <h3 className="text-sm font-bold tracking-wide uppercase mb-1">{formData.ministryName}</h3>
                                <h1 className="text-xl font-extrabold uppercase tracking-wide mb-1">{formData.universityName}</h1>
                                <h2 className="text-md font-bold uppercase tracking-wide">BIRO AKADEMIK</h2>
                                <h2 className="text-md font-bold uppercase tracking-wide">DAN KEMAHASISWAAN</h2>
                                <p className="text-xs mt-1">Kampus Air Tawar, Website: www.unp.ac.id</p>
                            </div>
                        </div>

                        {/* Title */}
                        <h2 className="text-center text-lg font-bold uppercase mb-8">{formData.cardTitle}</h2>

                        {/* Content Grid */}
                        <div className="flex">
                            <div className="flex-grow space-y-3 text-sm pl-4">
                                <div className="flex">
                                    <span className="w-40">Nama</span>
                                    <span className="font-medium uppercase">: {formData.studentName}</span>
                                </div>
                                <div className="flex">
                                    <span className="w-40">TahunMasuk/NIM</span>
                                    <span className="font-medium">: {formData.nim}</span>
                                </div>
                                <div className="flex">
                                    <span className="w-40">No. Seleksi</span>
                                    <span className="font-medium">: {formData.selectionNo}</span>
                                </div>
                                <div className="flex">
                                    <span className="w-40">Jenjang Program</span>
                                    <span className="font-medium">: {formData.programLevel}</span>
                                </div>
                                <div className="flex">
                                    <span className="w-40">Program Studi</span>
                                    <span className="font-medium">: {formData.studyProgram}</span>
                                </div>
                                <div className="flex">
                                    <span className="w-40">Status Masuk</span>
                                    <span className="font-medium">: {formData.entryStatus}</span>
                                </div>
                            </div>
                        </div>

                        {/* Footer: Photo & Signature */}
                        <div className="flex justify-between items-end mt-8 px-8">
                            <div className="w-28 h-36 bg-gray-200 border border-gray-400 overflow-hidden">
                                {photo ? (
                                    <img src={photo} alt="Student" className="w-full h-full object-cover" crossOrigin="anonymous" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs text-center p-2">3x4 Photo</div>
                                )}
                            </div>
                            
                            <div className="text-center">
                                <p className="text-sm mb-8">{formData.dateCity}, {formData.date}</p>
                                {/* Signature Placeholder */}
                                <div className="h-12 flex items-center justify-center mb-2">
                                     <p className="font-cursive text-2xl" style={{ fontFamily: "'Dancing Script', cursive" }}>{formData.studentName.split(' ')[0]}</p>
                                </div>
                                <p className="text-sm font-bold border-b border-black inline-block pb-0.5 mb-1">{formData.signerName}</p>
                                <p className="text-xs">NIP. {formData.signerNip}</p>
                            </div>
                        </div>
                        
                        {/* Google Font Injection for Signature */}
                        <style>{`
                            @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&display=swap');
                        `}</style>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentIdCardGenerator;
