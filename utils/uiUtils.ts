import {
    BriefcaseIcon, HeartIcon, BanknotesIcon, HomeIcon,
    PuzzlePieceIcon, BeakerIcon, MusicalNoteIcon, AcademicCapIcon,
    ComputerDesktopIcon, DevicePhoneMobileIcon, TruckIcon, BoltIcon,
    FaceSmileIcon
} from '@heroicons/react/24/outline';

export const getCategoryIcon = (cat: string) => {
    switch (cat?.toLowerCase()) {
        case 'career': return BriefcaseIcon;
        case 'health': return HeartIcon;
        case 'finance': return BanknotesIcon;
        case 'household': return HomeIcon;
        case 'creativity': return MusicalNoteIcon;
        case 'learning': return AcademicCapIcon;
        case 'experiment': return BeakerIcon;
        // Context Icons
        case 'at computer': return ComputerDesktopIcon;
        case 'on phone': return DevicePhoneMobileIcon;
        case 'need car': return TruckIcon;
        case 'around the house': return HomeIcon;
        case 'low mental load': return FaceSmileIcon;
        default: return PuzzlePieceIcon;
    }
};

export const getCategoryColor = (cat: string) => {
    switch (cat?.toLowerCase()) {
        case 'career': return 'bg-indigo-50 border-indigo-100 text-indigo-600';
        case 'health': return 'bg-rose-50 border-rose-100 text-rose-600';
        case 'finance': return 'bg-emerald-50 border-emerald-100 text-emerald-600';
        case 'household': return 'bg-amber-50 border-amber-100 text-amber-600';
        default: return 'bg-slate-50 border-slate-100 text-slate-600';
    }
};
export const getBatchColor = (batchId: string) => {
    const colors = [
        'bg-purple-500 border-purple-600',
        'bg-blue-500 border-blue-600',
        'bg-emerald-500 border-emerald-600',
        'bg-orange-500 border-orange-600',
        'bg-pink-500 border-pink-600',
        'bg-cyan-500 border-cyan-600',
        'bg-amber-500 border-amber-600',
        'bg-fuchsia-500 border-fuchsia-600'
    ];

    // Simple hash for consistent color
    let hash = 0;
    for (let i = 0; i < batchId.length; i++) {
        hash = batchId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
};
