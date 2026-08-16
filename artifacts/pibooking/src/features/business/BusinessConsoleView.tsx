import React, { useState, useEffect } from 'react';
import { useBusiness } from '../../hooks/useBusiness';
import { useServices } from '../../hooks/useServices';
import { useBookings } from '../../hooks/useBookings';
import { useExchangeRate } from '../../hooks/useExchangeRate';
import { useAuth } from '../../hooks/useAuth';
import { customerService } from '../../services/customerService';
import { providerService } from '../../services/providerService';
import { bookingService } from '../../services/bookingService';
import { pricingService } from '../../services/pricingService';
import { marketplaceSettingsService } from '../../services/marketplaceSettingsService';
import { Service, Booking, BookingStatus, Customer, ServiceStatus, BusinessHours, Provider } from '../../types';
import { isSupabaseConfigured } from '../../lib/supabase';
import { toast } from '../../hooks/use-toast';
import {
  DollarSign,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  Clock,
  Calendar,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  User,
  Phone,
  Mail,
  ShieldCheck,
  Save,
  Key,
  Users,
  LogOut,
  Tag,
  BarChart3,
  Globe,
  Wallet,
  Building,
  UserCheck,
  BadgeCheck,
  Award,
  Sparkles,
  Briefcase,
  Sliders,
} from 'lucide-react';

interface BusinessConsoleViewProps {
  onExitConsole: () => void;
  onDataChanged?: () => void;
}

export const BusinessConsoleView: React.FC<BusinessConsoleViewProps> = ({
  onExitConsole,
  onDataChanged,
}) => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'services' | 'bookings' | 'customers' | 'pricing' | 'escrow' | 'profile' | 'hours' | 'settings' | 'providers'
  >('overview');

  const { business, updateBusiness, refreshBusiness } = useBusiness();
  const { services, addService, updateService, deleteService, refreshServices } = useServices();
  const { bookings, updateBookingStatus, refreshBookings } = useBookings();
  const { exchangeRateNGN, updateExchangeRate, refreshExchangeRate } = useExchangeRate();
  const { passcode, updatePasscode, logout } = useAuth();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [inputRate, setInputRate] = useState<string>(() => pricingService.getExchangeRateNGN().toString());
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Provider State
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<string>('');
  const [isNewProviderMode, setIsNewProviderMode] = useState(false);
  const [newProviderName, setNewProviderName] = useState('');
  const [newProviderPiUsername, setNewProviderPiUsername] = useState('');
  const [newProviderWalletAddress, setNewProviderWalletAddress] = useState('');
  const [newProviderRole, setNewProviderRole] = useState('');
  const [newProviderPhotoUrl, setNewProviderPhotoUrl] = useState('');
  const [newProviderBio, setNewProviderBio] = useState('');

  // Rich Provider Management Modal State
  const [isProviderModalOpen, setIsProviderModalOpen] = useState(false);
  const [editingProviderId, setEditingProviderId] = useState<string | null>(null);

  // Section 1: Basic Identity & Contact
  const [pFullName, setPFullName] = useState('');
  const [pPiUsername, setPPiUsername] = useState('');
  const [pPiUid, setPPiUid] = useState('');
  const [pPiWalletAddress, setPPiWalletAddress] = useState('');
  const [pRoleTitle, setPRoleTitle] = useState('');
  const [pHeadline, setPHeadline] = useState('');
  const [pPhotoUrl, setPPhotoUrl] = useState('');
  const [pContactEmail, setPContactEmail] = useState('');
  const [pContactPhone, setPContactPhone] = useState('');
  const [pLocation, setPLocation] = useState('');

  // Section 2: Professional Experience & Capabilities
  const [pBio, setPBio] = useState('');
  const [pExperienceLevel, setPExperienceLevel] = useState<string>('Intermediate');
  const [pYearsExperience, setPYearsExperience] = useState<string>('3');
  const [pServiceMode, setPServiceMode] = useState<string>('Remote / Online');
  const [pSpecialtiesStr, setPSpecialtiesStr] = useState('');
  const [pSkillsStr, setPSkillsStr] = useState('');
  const [pLanguagesStr, setPLanguagesStr] = useState('English');

  // Section 3: Availability & Operations
  const [pAvailabilityStatus, setPAvailabilityStatus] = useState<string>('available');
  const [pResponseTime, setPResponseTime] = useState('Within 1 hour');
  const [pStatus, setPStatus] = useState<Provider['status']>('Approved');
  const [pProfileVisibility, setPProfileVisibility] = useState<string>('public');

  // Section 4: Verifications & Badges (Admin Overrides)
  const [pProfileVerified, setPProfileVerified] = useState<boolean>(true);
  const [pPiVerified, setPPiVerified] = useState<boolean>(true);

  // Section 5: Portfolio & External Links
  const [pWebsite, setPWebsite] = useState('');
  const [pSocialTwitter, setPSocialTwitter] = useState('');
  const [pSocialGithub, setPSocialGithub] = useState('');
  const [pSocialLinkedin, setPSocialLinkedin] = useState('');
  const [pPortfolioImagesStr, setPPortfolioImagesStr] = useState('');

  // Service Edit / Add Form
  const [isServiceFormOpen, setIsServiceFormOpen] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [shortDesc, setShortDesc] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [deliverablesStr, setDeliverablesStr] = useState('');
  const [duration, setDuration] = useState('60');
  const [basePrice, setBasePrice] = useState('150000');
  const [serviceStatus, setServiceStatus] = useState<ServiceStatus>('Published');
  const [category, setCategory] = useState('web_dev');

  // Service Delete Confirmation State
  const [deletingService, setDeletingService] = useState<{ id: string; name: string } | null>(null);
  const [isDeletingService, setIsDeletingService] = useState(false);

  // Business Profile Form
  const [bName, setBName] = useState(business.name);
  const [bTagline, setBTagline] = useState(business.tagline);
  const [bPhone, setBPhone] = useState(business.phone);
  const [bEmail, setBEmail] = useState(business.email);
  const [bBio, setBBio] = useState(business.bio);
  const [bWallet, setBWallet] = useState(business.piWalletAddress);
  const [bWebsite, setBWebsite] = useState(business.website);

  // Business Hours Form
  const [hours, setHours] = useState<BusinessHours>(business.businessHours);

  // Passcode Security Form
  const [newPasscode, setNewPasscode] = useState('');

  // Escrow Payout Loading State
  const [releasingPayoutBookingId, setReleasingPayoutBookingId] = useState<string | null>(null);

  // Marketplace Settings State (Become a Provider Popup Toggle)
  const [becomeProviderPopupEnabled, setBecomeProviderPopupEnabled] = useState<boolean>(false);
  const [isSettingsLoading, setIsSettingsLoading] = useState<boolean>(true);
  const [isSavingSetting, setIsSavingSetting] = useState<boolean>(false);

  useEffect(() => {
    providerService.getProvidersAsync().then(setProviders);
  }, []);

  useEffect(() => {
    marketplaceSettingsService.getBecomeProviderPopupEnabled().then((val) => {
      setBecomeProviderPopupEnabled(val);
      setIsSettingsLoading(false);
    });
  }, []);

  useEffect(() => {
    setInputRate(exchangeRateNGN.toString());
  }, [exchangeRateNGN]);

  useEffect(() => {
    setBName(business.name);
    setBTagline(business.tagline);
    setBPhone(business.phone);
    setBEmail(business.email);
    setBBio(business.bio);
    setBWallet(business.piWalletAddress);
    setBWebsite(business.website);
    if (business.businessHours) {
      setHours(business.businessHours);
    }
  }, [business]);

  useEffect(() => {
    customerService.getCustomersAsync().then(setCustomers);
  }, [bookings]);

  const showToast = (msg: string) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(null), 4000);
  };

  const handleRefreshAll = async () => {
    setIsSettingsLoading(true);
    await Promise.all([
      refreshBusiness(),
      refreshServices(),
      refreshBookings(),
      refreshExchangeRate(),
      customerService.getCustomersAsync().then(setCustomers),
      providerService.getProvidersAsync().then(setProviders),
      marketplaceSettingsService.getBecomeProviderPopupEnabled().then((val) => {
        setBecomeProviderPopupEnabled(val);
        setIsSettingsLoading(false);
      }),
    ]);
    if (onDataChanged) onDataChanged();
    showToast('Console data refreshed from database.');
  };

  const handleToggleBecomeProviderPopup = async (newState: boolean) => {
    const previousState = becomeProviderPopupEnabled;
    setBecomeProviderPopupEnabled(newState);
    setIsSavingSetting(true);

    const res = await marketplaceSettingsService.updateBecomeProviderPopupEnabled(newState);

    setIsSavingSetting(false);
    if (res.success) {
      showToast(`"Become a Provider Popup" turned ${newState ? 'ON' : 'OFF'}.`);
    } else {
      setBecomeProviderPopupEnabled(previousState);
      showToast(`Failed to update setting: ${res.error || 'Database error'}`);
    }
  };

  const handleSaveRate = async (e: React.FormEvent) => {
    e.preventDefault();
    const rate = parseFloat(inputRate);
    if (!rate || rate <= 0) return;
    await updateExchangeRate(rate);
    await refreshServices();
    if (onDataChanged) onDataChanged();
    showToast(`Exchange rate updated! 1 Pi = ₦${rate.toLocaleString()} NGN.`);
  };

  const handleOpenAddService = () => {
    setEditingServiceId(null);
    setTitle('');
    setShortDesc('');
    setCoverImage('https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=80');
    setDeliverablesStr('Custom UI design & modern layout\nMobile & tablet optimization\nSEO setup');
    setDuration('60');
    setBasePrice('150000');
    setServiceStatus('Published');
    setCategory('web_dev');
    setSelectedProviderId('');
    setIsNewProviderMode(false);
    setNewProviderName('');
    setNewProviderPiUsername('');
    setNewProviderWalletAddress('');
    setNewProviderRole('');
    setNewProviderPhotoUrl('');
    setNewProviderBio('');
    setIsServiceFormOpen(true);
  };

  const handleOpenEditService = (s: Service) => {
    setEditingServiceId(s.id);
    setTitle(s.name);
    setShortDesc(s.description);
    setCoverImage(s.coverImageUrl || '');
    setDeliverablesStr(s.included.join('\n'));
    setDuration(s.durationMinutes.toString());
    setBasePrice((s.basePrice || s.priceNGN).toString());
    setServiceStatus(s.status || 'Published');
    setCategory(s.category);
    setSelectedProviderId(s.providerId || '');
    setIsNewProviderMode(false);
    setNewProviderName('');
    setNewProviderPiUsername('');
    setNewProviderRole('');
    setNewProviderPhotoUrl('');
    setIsServiceFormOpen(true);
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const deliverables = deliverablesStr
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);

    const numericPrice = parseFloat(basePrice) || 100000;
    const numericDuration = parseInt(duration, 10) || 60;

    let finalProviderId: string | undefined = selectedProviderId || undefined;
    const selectedProviderObj = providers.find((p) => p.id === finalProviderId);

    if (editingServiceId) {
      await updateService(editingServiceId, {
        name: title.trim(),
        description: shortDesc.trim(),
        coverImageUrl: coverImage.trim(),
        included: deliverables,
        durationMinutes: numericDuration,
        basePrice: numericPrice,
        priceNGN: numericPrice,
        currency: 'NGN',
        status: serviceStatus,
        category,
        ...(finalProviderId ? { providerId: finalProviderId } : {}),
        ...(selectedProviderObj ? { providerName: selectedProviderObj.fullName, providerRole: selectedProviderObj.roleTitle } : {}),
      });
      showToast('Service updated successfully.');
    } else {
      await addService({
        name: title.trim(),
        description: shortDesc.trim(),
        coverImageUrl: coverImage.trim(),
        included: deliverables,
        durationMinutes: numericDuration,
        basePrice: numericPrice,
        currency: 'NGN',
        priceNGN: numericPrice,
        pricePi: parseFloat((numericPrice / exchangeRateNGN).toFixed(2)),
        featured: false,
        providerName: selectedProviderObj?.fullName || 'Alex Rivera',
        providerRole: selectedProviderObj?.roleTitle || 'Lead Specialist',
        locationType: 'Online / Remote',
        status: serviceStatus,
        category,
        ...(finalProviderId ? { providerId: finalProviderId } : {}),
      });
      showToast('New service added to catalog.');
    }

    const refreshedProviders = await providerService.getProvidersAsync();
    setProviders(refreshedProviders);

    setIsServiceFormOpen(false);
    if (onDataChanged) onDataChanged();
  };

  const confirmDeleteService = async () => {
    if (!deletingService) return;
    setIsDeletingService(true);
    try {
      await deleteService(deletingService.id);
      if (onDataChanged) onDataChanged();
      showToast(`Service "${deletingService.name}" deleted.`);
    } catch (err) {
      console.error('[Delete Error]', err);
      showToast('Failed to delete service');
    } finally {
      setIsDeletingService(false);
      setDeletingService(null);
    }
  };

  const handleStatusChange = async (id: string, status: BookingStatus) => {
    await updateBookingStatus(id, status);
    if (onDataChanged) onDataChanged();
    showToast(`Booking status changed to ${status}.`);
  };

  const handleReleasePayout = async (booking: Booking) => {
    if (!booking) return;
    setReleasingPayoutBookingId(booking.id);

    try {
      // 1. Look up the booking's provider via booking.providerId
      let provider = providers.find((p) => p.id === booking.providerId);
      if (!provider && booking.providerId) {
        provider = (await providerService.getProviderByIdAsync(booking.providerId)) || undefined;
      }

      // 2. Get provider.piUid (the A2U SDK needs the Pi UID, not just the wallet address)
      const providerPiUid = provider?.piUid || booking.providerPiUsername;
      if (!providerPiUid) {
        throw new Error('Provider Pi UID is missing. The provider must have a registered Pi UID to receive payouts.');
      }

      const providerWalletAddress = provider?.piWalletAddress || booking.providerWalletAddress || '';

      // 3. Calculate payout amount (provider gets 90%, platform fee 10%, rounded to 7 decimals)
      const pricePi = Number(booking.pricePi || 0);
      const providerPayoutPi = Number((pricePi * 0.90).toFixed(7));

      // 4. POST to /api/pi/payouts/release with bookingId, amountPi, providerPiUid, providerWalletAddress
      const res = await fetch('/api/pi/payouts/release', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: booking.id,
          amountPi: providerPayoutPi,
          providerPiUid,
          providerWalletAddress,
        }),
      });

      const data = await res.json().catch(() => ({}));

      // 5. WAIT for backend to return successful txid before doing anything else
      if (!res.ok || !data.txid) {
        const errorMsg = data.error || data.message || `Payout transaction failed with status ${res.status}`;
        throw new Error(errorMsg);
      }

      const txid = data.txid;

      // 6. ONLY IF successful: update the booking with escrow_status='released', status='Completed', released_at=timestamp, provider_payout_pi=amount, platform_fee_pi=amount, payoutTxHash=txid
      await bookingService.updateBookingEscrowStatusAsync(booking.id, 'released', txid);
      await refreshBookings();
      if (onDataChanged) onDataChanged();

      toast({
        title: 'Payout Released',
        description: `Successfully released ${providerPayoutPi} π payout. Tx Hash: ${txid}`,
      });
      showToast(`Escrow payout of ${providerPayoutPi} π released successfully. Tx Hash: ${txid}`);
    } catch (err: any) {
      // 7. IF A2U call fails: do NOT change any booking state. Show actual error message to admin.
      console.error('[A2U Payout Error]', err);
      toast({
        title: 'Payout Failed',
        description: err?.message || 'Failed to process Pi payout. Booking remains in escrow queue.',
        variant: 'destructive',
      });
      showToast(`Payout Failed: ${err?.message || 'Error releasing payout'}`);
    } finally {
      setReleasingPayoutBookingId(null);
    }
  };


  const handleOpenAddProvider = () => {
    setEditingProviderId(null);
    setPFullName('');
    setPPiUsername('');
    setPPiUid('');
    setPPiWalletAddress('');
    setPRoleTitle('Specialist');
    setPHeadline('');
    setPPhotoUrl('');
    setPContactEmail('');
    setPContactPhone('');
    setPLocation('Remote');

    setPBio('');
    setPExperienceLevel('Intermediate');
    setPYearsExperience('3');
    setPServiceMode('Remote / Online');
    setPSpecialtiesStr('');
    setPSkillsStr('');
    setPLanguagesStr('English');

    setPAvailabilityStatus('available');
    setPResponseTime('Within 1 hour');
    setPStatus('Approved');
    setPProfileVisibility('public');

    setPProfileVerified(true);
    setPPiVerified(true);

    setPWebsite('');
    setPSocialTwitter('');
    setPSocialGithub('');
    setPSocialLinkedin('');
    setPPortfolioImagesStr('');

    setIsProviderModalOpen(true);
  };

  const handleOpenEditProvider = (p: Provider) => {
    setEditingProviderId(p.id);
    setPFullName(p.fullName || '');
    setPPiUsername(p.piUsername ? p.piUsername.replace(/^@+/, '') : '');
    setPPiUid(p.piUid || '');
    setPPiWalletAddress(p.piWalletAddress || '');
    setPRoleTitle(p.roleTitle || '');
    setPHeadline(p.headline || '');
    setPPhotoUrl(p.photoUrl || '');
    setPContactEmail(p.contactEmail || '');
    setPContactPhone(p.contactPhone || '');
    setPLocation(p.location || '');

    setPBio(p.bio || '');
    setPExperienceLevel((p.experienceLevel as any) || 'Intermediate');
    setPYearsExperience(p.yearsExperience !== undefined && p.yearsExperience !== null ? p.yearsExperience.toString() : '');
    setPServiceMode((p.serviceMode as any) || 'Remote / Online');
    setPSpecialtiesStr(p.specialties ? p.specialties.join(', ') : '');
    setPSkillsStr(p.skills ? p.skills.join(', ') : '');
    setPLanguagesStr(p.languages ? p.languages.join(', ') : 'English');

    setPAvailabilityStatus((p.availabilityStatus as any) || 'available');
    setPResponseTime(p.responseTime || 'Within 1 hour');
    setPStatus(p.status || 'Approved');
    setPProfileVisibility((p.profileVisibility as any) || 'public');

    setPProfileVerified(p.profileVerified ?? false);
    setPPiVerified(p.piVerified ?? false);

    setPWebsite(p.website || '');
    const twitter = p.socialLinks?.find((s) => s.platform === 'twitter')?.url || '';
    const github = p.socialLinks?.find((s) => s.platform === 'github')?.url || '';
    const linkedin = p.socialLinks?.find((s) => s.platform === 'linkedin')?.url || '';
    setPSocialTwitter(twitter);
    setPSocialGithub(github);
    setPSocialLinkedin(linkedin);

    setPPortfolioImagesStr(p.portfolioImages ? p.portfolioImages.join('\n') : '');

    setIsProviderModalOpen(true);
  };

  const handleSaveProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pFullName.trim()) {
      showToast('Full name is required');
      return;
    }

    const specialties = pSpecialtiesStr
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const skills = pSkillsStr
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const languages = pLanguagesStr
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const portfolioImages = pPortfolioImagesStr
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean);

    const socialLinks = [
      pSocialTwitter.trim() ? { platform: 'twitter', url: pSocialTwitter.trim(), handle: pSocialTwitter.trim() } : null,
      pSocialGithub.trim() ? { platform: 'github', url: pSocialGithub.trim(), handle: pSocialGithub.trim() } : null,
      pSocialLinkedin.trim() ? { platform: 'linkedin', url: pSocialLinkedin.trim(), handle: pSocialLinkedin.trim() } : null,
    ].filter(Boolean) as any[];

    const providerData: Partial<Provider> = {
      fullName: pFullName.trim(),
      piUsername: pPiUsername.trim() ? (pPiUsername.trim().startsWith('@') ? pPiUsername.trim() : `@${pPiUsername.trim()}`) : undefined,
      piUid: pPiUid.trim() || undefined,
      piWalletAddress: pPiWalletAddress.trim() || undefined,
      roleTitle: pRoleTitle.trim() || 'Specialist',
      headline: pHeadline.trim() || undefined,
      photoUrl: pPhotoUrl.trim() || undefined,
      contactEmail: pContactEmail.trim() || undefined,
      contactPhone: pContactPhone.trim() || undefined,
      location: pLocation.trim() || undefined,

      bio: pBio.trim() || undefined,
      experienceLevel: pExperienceLevel || undefined,
      yearsExperience: pYearsExperience ? parseInt(pYearsExperience, 10) : undefined,
      serviceMode: pServiceMode || undefined,
      specialties,
      skills,
      languages,

      availabilityStatus: pAvailabilityStatus,
      responseTime: pResponseTime.trim() || undefined,
      status: pStatus,
      profileVisibility: pProfileVisibility,

      profileVerified: pProfileVerified,
      piVerified: pPiVerified,

      website: pWebsite.trim() || undefined,
      socialLinks,
      portfolioImages,
    };

    if (editingProviderId) {
      await providerService.updateProvider(editingProviderId, providerData);
      showToast(`Provider "${pFullName}" updated successfully.`);
    } else {
      await providerService.addProvider(providerData as any);
      showToast(`New provider "${pFullName}" added successfully.`);
    }

    const refreshed = await providerService.getProvidersAsync();
    setProviders(refreshed);
    setIsProviderModalOpen(false);
    if (onDataChanged) onDataChanged();
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateBusiness({
      name: bName,
      tagline: bTagline,
      phone: bPhone,
      email: bEmail,
      bio: bBio,
      piWalletAddress: bWallet,
      website: bWebsite,
    });
    if (onDataChanged) onDataChanged();
    showToast('Business Profile updated.');
  };

  const handleSaveHours = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateBusiness({ businessHours: hours });
    if (onDataChanged) onDataChanged();
    showToast('Business hours saved successfully.');
  };

  const handleUpdatePasscodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPasscode.trim().length < 4) {
      alert('Passcode must be at least 4 characters long.');
      return;
    }
    updatePasscode(newPasscode.trim());
    setNewPasscode('');
    showToast('Admin passcode updated.');
  };

  // Metrics
  const totalRevenuePi = bookings.reduce((sum, b) => sum + (b.pricePi || 0), 0);
  const totalRevenueNGN = bookings.reduce((sum, b) => sum + (b.basePrice || b.priceNGN || 0), 0);
  const completedBookings = bookings.filter((b) => b.status === 'Completed').length;
  const confirmedBookings = bookings.filter((b) => b.status === 'Confirmed').length;
  const escrowBookings = bookings.filter((b) => b.escrow_status === 'completion_confirmed');

  return (
    <div className="min-h-screen bg-white text-zinc-900 flex flex-col font-sans">
      {/* Top Banner Bar */}
      <header className="bg-white/95 border-b border-zinc-200 sticky top-0 z-30 backdrop-blur-md px-4 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onExitConsole}
            className="p-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-200 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-sm text-zinc-900 tracking-wide">Pi Business OS</span>
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-mono border border-amber-300 font-bold">
                Console
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 hidden sm:block">
              {business.name} — Merchant Operating System
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefreshAll}
            className="p-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-200 text-xs flex items-center gap-1.5 font-bold transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Sync Data</span>
          </button>
          <button
            onClick={() => {
              logout();
              onExitConsole();
            }}
            className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs flex items-center gap-1.5 font-bold transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Exit Console</span>
          </button>
        </div>
      </header>

      {/* Toast Notification */}
      {statusMsg && (
        <div className="fixed top-16 right-4 z-50 bg-amber-500 text-zinc-950 px-4 py-2.5 rounded-xl font-black text-xs shadow-xl animate-in slide-in-from-top-2 border border-amber-600/30">
          {statusMsg}
        </div>
      )}

      {/* Main Grid Layout */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 md:grid-cols-5 gap-6">
        {/* Navigation Sidebar */}
        <aside className="md:col-span-1 space-y-1">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'services', label: 'Services Catalog', icon: Tag },
            { id: 'providers', label: 'Providers Directory', icon: UserCheck },
            { id: 'bookings', label: 'Bookings & Orders', icon: Calendar },
            { id: 'customers', label: 'Customer Directory', icon: Users },
            { id: 'pricing', label: 'Pricing & Exchange', icon: DollarSign },
            { id: 'escrow', label: 'Escrow Payouts', icon: ShieldCheck },
            { id: 'profile', label: 'Business Profile', icon: Building },
            { id: 'hours', label: 'Business Hours', icon: Clock },
            { id: 'settings', label: 'Security & Access', icon: Key },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition text-left ${
                  isActive
                    ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/10'
                    : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </aside>

        {/* Content Panel */}
        <main className="md:col-span-4 space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-white border border-zinc-200 space-y-1 shadow-xs">
                  <span className="text-xs font-bold text-zinc-500">Total Pi Revenue</span>
                  <div className="text-2xl font-black text-amber-600 font-mono flex items-center gap-1">
                    <span>{totalRevenuePi.toFixed(2)}</span>
                    <span className="text-xs">π</span>
                  </div>
                  <span className="text-[11px] text-zinc-500 block">≈ ₦{totalRevenueNGN.toLocaleString()} NGN</span>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-zinc-200 space-y-1 shadow-xs">
                  <span className="text-xs font-bold text-zinc-500">Total Orders</span>
                  <div className="text-2xl font-black text-zinc-900 font-mono">{bookings.length}</div>
                  <span className="text-[11px] text-emerald-700 font-bold block">{completedBookings} Completed</span>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-zinc-200 space-y-1 shadow-xs">
                  <span className="text-xs font-bold text-zinc-500">Active Services</span>
                  <div className="text-2xl font-black text-zinc-900 font-mono">{services.length}</div>
                  <span className="text-[11px] text-zinc-500 block">In Service Catalog</span>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-zinc-200 space-y-1 shadow-xs">
                  <span className="text-xs font-bold text-zinc-500">Exchange Rate</span>
                  <div className="text-2xl font-black text-amber-600 font-mono">₦{exchangeRateNGN.toLocaleString()}</div>
                  <span className="text-[11px] text-zinc-500 block">Per 1 Pi Network Token</span>
                </div>
              </div>

              {/* Recent Orders List */}
              <div className="p-5 rounded-2xl bg-white border border-zinc-200 space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-zinc-900">Recent Orders & Bookings</h3>
                  <button
                    onClick={() => setActiveTab('bookings')}
                    className="text-xs font-bold text-amber-600 hover:text-amber-700 hover:underline"
                  >
                    View All ({bookings.length})
                  </button>
                </div>

                {bookings.length === 0 ? (
                  <p className="text-xs text-zinc-500 py-6 text-center">No bookings received yet.</p>
                ) : (
                  <div className="divide-y divide-zinc-100">
                    {bookings.slice(0, 5).map((b) => (
                      <div key={b.id} className="py-3 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-zinc-900">{b.serviceName}</p>
                          <p className="text-[11px] text-zinc-500">
                            Client: @{b.clientPiUsername} • {b.date} at {b.timeSlot}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-amber-600">{b.pricePi} π</span>
                          <span className="block text-[10px] text-zinc-500">₦{(b.basePrice || b.priceNGN).toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: SERVICES CATALOG */}
          {activeTab === 'services' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-zinc-900">Services Catalog</h3>
                  <p className="text-xs text-zinc-500">Manage your active offerings and pricing</p>
                </div>
                <button
                  onClick={handleOpenAddService}
                  className="px-3.5 py-2 rounded-xl bg-amber-500 text-zinc-950 text-xs font-black flex items-center gap-1.5 transition hover:bg-amber-400 shadow-md shadow-amber-500/20"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Service</span>
                </button>
              </div>

              {isServiceFormOpen && (
                <form onSubmit={handleSaveService} className="p-5 sm:p-6 rounded-2xl bg-zinc-50 border border-amber-300 shadow-lg space-y-4 animate-in fade-in duration-200">
                  <h4 className="text-xs font-black text-amber-700 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    <span>{editingServiceId ? 'Edit Service' : 'New Service Offering'}</span>
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-zinc-700 mb-1">Service Title</label>
                      <input
                        type="text"
                        required
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. 1-Page SaaS Landing Page"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-zinc-300 text-zinc-900 text-xs focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-700 mb-1">Category</label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-zinc-300 text-zinc-900 text-xs focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                      >
                        <option value="landing_page">Landing Page</option>
                        <option value="web_dev">Web Development</option>
                        <option value="ux_design">UI/UX Audit</option>
                        <option value="pi_sdk">Pi Payment SDK Setup</option>
                        <option value="consulting">Consulting</option>
                      </select>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold text-zinc-700">Provider</label>
                        <button
                          type="button"
                          onClick={() => {
                            setIsServiceFormOpen(false);
                            setActiveTab('providers');
                            handleOpenAddProvider();
                          }}
                          className="text-[11px] font-bold text-amber-700 hover:text-amber-800 underline cursor-pointer"
                        >
                          + Add New Provider
                        </button>
                      </div>
                      <select
                        value={selectedProviderId}
                        onChange={(e) => {
                          if (e.target.value === 'new') {
                            setIsServiceFormOpen(false);
                            setActiveTab('providers');
                            handleOpenAddProvider();
                          } else {
                            setSelectedProviderId(e.target.value);
                          }
                        }}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-zinc-300 text-zinc-900 text-xs focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                      >
                        <option value="">-- Select Provider --</option>
                        {providers.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.fullName} ({p.roleTitle || 'Specialist'})
                          </option>
                        ))}
                        <option value="new">+ Add New Provider</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-700 mb-1">Base Price (NGN)</label>
                      <input
                        type="number"
                        required
                        value={basePrice}
                        onChange={(e) => setBasePrice(e.target.value)}
                        placeholder="150000"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-zinc-300 text-zinc-900 text-xs font-mono focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                      />
                      <span className="text-[11px] text-amber-700 mt-1 block font-bold">
                        Calculated Pi Price: {(parseFloat(basePrice || '0') / exchangeRateNGN).toFixed(2)} π
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-700 mb-1">Duration (Minutes)</label>
                      <input
                        type="number"
                        required
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        placeholder="60"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-zinc-300 text-zinc-900 text-xs font-mono focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Short Description</label>
                    <textarea
                      rows={2}
                      value={shortDesc}
                      onChange={(e) => setShortDesc(e.target.value)}
                      placeholder="Concise overview of what client receives"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-zinc-300 text-zinc-900 text-xs focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Included Deliverables (One per line)</label>
                    <textarea
                      rows={3}
                      value={deliverablesStr}
                      onChange={(e) => setDeliverablesStr(e.target.value)}
                      placeholder="Custom UI design&#10;Mobile responsiveness&#10;Domain setup"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-zinc-300 text-zinc-900 text-xs focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all font-mono"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsServiceFormOpen(false)}
                      className="px-4 py-2.5 rounded-xl bg-zinc-200 hover:bg-zinc-300 text-zinc-800 text-xs font-bold transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black flex items-center gap-1.5 transition-all active:scale-[0.98] shadow-md shadow-amber-500/20 cursor-pointer"
                    >
                      <Save className="w-4 h-4" />
                      <span>Save Service</span>
                    </button>
                  </div>
                </form>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {services.map((s) => (
                  <div key={s.id} className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-xs space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between">
                        <h4 className="font-extrabold text-sm text-zinc-900">{s.name}</h4>
                        <span className="font-mono font-bold text-amber-600 text-sm">{s.pricePi} π</span>
                      </div>
                      <div className="text-xs text-zinc-600 mt-1">
                        {s.provider ? (
                          <span>
                            Provider: <span className="text-zinc-900 font-bold">{s.provider.fullName}</span> ({s.provider.roleTitle || 'Specialist'})
                          </span>
                        ) : s.providerName ? (
                          <span>
                            Provider: <span className="text-zinc-900 font-bold">{s.providerName}</span> ({s.providerRole || 'Specialist'})
                          </span>
                        ) : (
                          <span className="text-zinc-400 italic">No provider assigned</span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-600 mt-1 line-clamp-2">{s.description}</p>
                      <div className="text-[11px] text-zinc-500 mt-2 flex items-center gap-3">
                        <span>Duration: {s.durationMinutes}m</span>
                        <span>Base: ₦{(s.basePrice || s.priceNGN).toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
                      <button
                        onClick={() => handleOpenEditService(s)}
                        className="p-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs flex items-center gap-1 font-semibold border border-zinc-200"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => setDeletingService({ id: s.id, name: s.name })}
                        title="Delete service"
                        className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 text-xs flex items-center gap-1 transition-colors border border-red-200 font-semibold"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: BOOKINGS & ORDERS */}
          {activeTab === 'bookings' && (
            <div className="space-y-4">
              <h3 className="text-sm font-extrabold text-zinc-900">Bookings & Service Orders</h3>
              {bookings.length === 0 ? (
                <div className="p-8 rounded-2xl bg-white border border-zinc-200 text-center text-zinc-500 text-xs shadow-xs">
                  No bookings registered yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {bookings.map((b) => (
                    <div key={b.id} className="p-4 rounded-2xl bg-white border border-zinc-200 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-zinc-900">{b.serviceName}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              b.status === 'Completed'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : b.status === 'Confirmed'
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : 'bg-zinc-100 text-zinc-700 border border-zinc-200'
                            }`}
                          >
                            {b.status}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-600">
                          Client: <span className="text-zinc-900 font-bold">{b.clientName}</span>{b.clientPiUsername ? ` (@${b.clientPiUsername.replace(/^@+/, '')})` : ''} • {b.clientPhone}
                        </p>
                        <p className="text-xs text-zinc-600">
                          Date: <span className="text-zinc-800 font-medium">{b.date}</span> at <span className="text-zinc-800 font-medium">{b.timeSlot}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="font-mono font-black text-amber-600 text-sm">{b.pricePi} π</div>
                          <div className="text-[10px] text-zinc-500">₦{(b.basePrice || b.priceNGN).toLocaleString()}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}


          {/* TAB 4: ESCROW PAYOUTS */}
          {activeTab === 'escrow' && (
            <div className="space-y-4">
              <h3 className="text-sm font-extrabold text-zinc-900">
                Escrow Payout Queue
              </h3>

              {escrowBookings.length === 0 ? (
                <div className="p-8 rounded-2xl bg-white border border-zinc-200 text-center text-zinc-500 text-xs shadow-xs">
                  No completed bookings are awaiting payout.
                </div>
              ) : (
                <div className="space-y-3">
                  {escrowBookings.map((b) => (
                    <div
                      key={b.id}
                      className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-zinc-900">{b.serviceName}</p>
                          <p className="text-xs text-zinc-600 mt-0.5">
                            Client: <span className="text-zinc-900 font-bold">{b.clientName}</span>{b.clientPiUsername ? ` (@${b.clientPiUsername.replace(/^@+/, '')})` : ''} • Provider: <span className="text-zinc-900 font-bold">{b.providerName || 'Provider'}</span>
                          </p>
                        </div>

                        <div className="text-right">
                          <div className="font-black text-amber-600">
                            {b.pricePi} π
                          </div>
                          <button
                            type="button"
                            disabled={releasingPayoutBookingId === b.id}
                            onClick={() => handleReleasePayout(b)}
                            className="mt-2 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed ml-auto shadow-xs"
                          >
                            {releasingPayoutBookingId === b.id ? (
                              <>
                                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                <span>Releasing...</span>
                              </>
                            ) : (
                              <span>Release Payout</span>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: PROVIDERS DIRECTORY & MANAGEMENT */}
          {activeTab === 'providers' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-zinc-900 flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-amber-600" />
                    <span>Provider Directory & Public Profiles</span>
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Manage service provider public profiles, verification badges, and operational settings
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenAddProvider}
                  className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs flex items-center gap-1.5 transition shadow-md shadow-amber-500/20 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Provider</span>
                </button>
              </div>

              {providers.length === 0 ? (
                <div className="p-8 rounded-2xl bg-white border border-zinc-200 text-center space-y-3 shadow-xs">
                  <User className="w-8 h-8 text-zinc-400 mx-auto" />
                  <p className="text-sm text-zinc-600 font-medium">No service providers registered yet.</p>
                  <button
                    type="button"
                    onClick={handleOpenAddProvider}
                    className="px-4 py-2 rounded-xl bg-amber-500 text-zinc-950 font-black text-xs shadow-md shadow-amber-500/20"
                  >
                    Create First Provider Profile
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {providers.map((p) => {
                    const cleanUsername = p.piUsername ? p.piUsername.replace(/^@+/, '') : '';
                    return (
                      <div
                        key={p.id}
                        className="p-5 rounded-2xl bg-white border border-zinc-200 hover:border-zinc-300 transition space-y-4 shadow-xs flex flex-col justify-between"
                      >
                        <div className="space-y-3">
                          {/* Header Avatar & Status */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              {/* Circular Profile Photo Container */}
                              <div className="relative shrink-0">
                                {p.photoUrl ? (
                                  <img
                                    src={p.photoUrl}
                                    alt={p.fullName}
                                    className="w-14 h-14 rounded-full object-cover border-2 border-amber-300 bg-zinc-100"
                                  />
                                ) : (
                                  <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-900 border-2 border-amber-300 flex items-center justify-center font-black text-lg">
                                    {p.fullName ? p.fullName.charAt(0).toUpperCase() : 'P'}
                                  </div>
                                )}
                                {p.availabilityStatus && (
                                  <span
                                    title={`Status: ${p.availabilityStatus}`}
                                    className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white ${
                                      p.availabilityStatus === 'available'
                                        ? 'bg-emerald-500'
                                        : p.availabilityStatus === 'busy'
                                        ? 'bg-amber-500'
                                        : 'bg-zinc-400'
                                    }`}
                                  />
                                )}
                              </div>

                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <h4 className="font-extrabold text-zinc-900 text-sm">{p.fullName}</h4>
                                  {p.profileVerified && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                                      <BadgeCheck className="w-3 h-3 text-emerald-700" />
                                      <span>Verified</span>
                                    </span>
                                  )}
                                  {p.piVerified && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold border border-amber-300 font-mono">
                                      <span>π Verified</span>
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs font-bold text-amber-700 mt-0.5">{p.roleTitle}</p>
                                {p.headline && <p className="text-[11px] text-zinc-500 line-clamp-1">{p.headline}</p>}
                              </div>
                            </div>

                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                                p.status === 'Approved'
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                  : p.status === 'Pending'
                                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                                  : 'bg-red-100 text-red-800 border-red-200'
                              }`}
                            >
                              {p.status}
                            </span>
                          </div>

                          {/* Quick Metadata */}
                          <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-600 pt-2 border-t border-zinc-100">
                            <div>
                              <span className="text-zinc-500 block">Pi Username:</span>
                              <span className="text-zinc-900 font-mono font-bold">{cleanUsername ? `@${cleanUsername}` : '—'}</span>
                            </div>
                            <div>
                              <span className="text-zinc-500 block">Location:</span>
                              <span className="text-zinc-900 font-medium">{p.location || '—'}</span>
                            </div>
                            <div>
                              <span className="text-zinc-500 block">Experience:</span>
                              <span className="text-zinc-900 font-medium">
                                {p.experienceLevel || '—'}
                                {p.yearsExperience ? ` (${p.yearsExperience} yrs)` : ''}
                              </span>
                            </div>
                            <div>
                              <span className="text-zinc-500 block">Service Mode:</span>
                              <span className="text-zinc-900 font-medium">{p.serviceMode || '—'}</span>
                            </div>
                          </div>

                          {/* Specialties & Skills Tags */}
                          {((p.specialties && p.specialties.length > 0) || (p.skills && p.skills.length > 0)) && (
                            <div className="flex flex-wrap gap-1 pt-1">
                              {p.specialties?.map((spec, i) => (
                                <span
                                  key={i}
                                  className="px-2 py-0.5 rounded-lg bg-zinc-100 text-zinc-800 text-[10px] font-medium border border-zinc-200"
                                >
                                  {spec}
                                </span>
                              ))}
                              {p.skills?.map((sk, i) => (
                                <span
                                  key={i}
                                  className="px-2 py-0.5 rounded-lg bg-amber-100 text-amber-900 text-[10px] font-mono border border-amber-300 font-bold"
                                >
                                  {sk}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Card Action */}
                        <div className="pt-3 border-t border-zinc-100 flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleOpenEditProvider(p)}
                            className="px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold text-xs flex items-center gap-1.5 transition border border-zinc-200"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Edit Provider Profile</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: CUSTOMERS DIRECTORY */}
          {activeTab === 'customers' && (
            <div className="space-y-4">
              <h3 className="text-sm font-extrabold text-zinc-900">Customer CRM Directory</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {customers.map((c) => (
                  <div key={c.id} className="p-4 rounded-2xl bg-white border border-zinc-200 space-y-2 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-zinc-900">{c.name}</span>
                      <span className="font-mono text-xs text-amber-700 font-bold">
                        {c.piUsername ? `@${c.piUsername.replace(/^@+/, '')}` : ''}
                      </span>
                    </div>
                    <div className="text-xs text-zinc-500 flex items-center gap-3">
                      <span>Bookings: <strong className="text-zinc-800">{c.totalBookings}</strong></span>
                      <span>Total Spend: <strong className="text-amber-700">{c.totalSpendPi} π</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: PRICING & EXCHANGE */}
          {activeTab === 'pricing' && (
            <form onSubmit={handleSaveRate} className="p-6 rounded-2xl bg-white border border-zinc-200 space-y-4 max-w-lg shadow-xs">
              <h3 className="text-sm font-extrabold text-zinc-900 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-amber-600" />
                <span>Global Exchange Rate Engine</span>
              </h3>
              <p className="text-xs text-zinc-500">
                Set the exchange rate of 1 Pi Network token in NGN. All service prices in Pi are calculated automatically based on this rate.
              </p>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">1 Pi Rate in NGN (₦)</label>
                <input
                  type="number"
                  value={inputRate}
                  onChange={(e) => setInputRate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-zinc-300 text-zinc-900 font-mono text-sm focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-amber-500 text-zinc-950 font-black text-xs flex items-center justify-center gap-1.5 hover:bg-amber-400 transition-all active:scale-[0.98] shadow-md shadow-amber-500/20 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Save Exchange Rate</span>
              </button>
            </form>
          )}

          {/* TAB 6: BUSINESS PROFILE */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="p-6 rounded-2xl bg-white border border-zinc-200 space-y-4 shadow-xs">
              <h3 className="text-sm font-extrabold text-zinc-900">Business Profile Settings</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Business Name</label>
                  <input
                    type="text"
                    value={bName}
                    onChange={(e) => setBName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-zinc-300 text-zinc-900 text-xs focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Tagline</label>
                  <input
                    type="text"
                    value={bTagline}
                    onChange={(e) => setBTagline(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-zinc-300 text-zinc-900 text-xs focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={bPhone}
                    onChange={(e) => setBPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-zinc-300 text-zinc-900 text-xs focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={bEmail}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-zinc-300 text-zinc-900 text-xs focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Pi Merchant Wallet</label>
                  <input
                    type="text"
                    value={bWallet}
                    onChange={(e) => setBWallet(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-zinc-300 text-zinc-900 text-xs font-mono focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Website URL</label>
                  <input
                    type="text"
                    value={bWebsite}
                    onChange={(e) => setBWebsite(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-zinc-300 text-zinc-900 text-xs focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Business Bio</label>
                <textarea
                  rows={3}
                  value={bBio}
                  onChange={(e) => setBBio(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-zinc-300 text-zinc-900 text-xs focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                />
              </div>

              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs flex items-center gap-1.5 transition-all active:scale-[0.98] shadow-md shadow-amber-500/20 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Save Business Profile</span>
              </button>
            </form>
          )}

          {/* TAB 7: BUSINESS HOURS & AVAILABILITY */}
          {activeTab === 'hours' && (
            <form onSubmit={handleSaveHours} className="p-6 rounded-2xl bg-white border border-zinc-200 space-y-4 shadow-xs">
              <h3 className="text-sm font-extrabold text-zinc-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>Business Operating Hours & Availability</span>
              </h3>
              <p className="text-xs text-zinc-500">Configure your daily working schedule for client appointments.</p>

              <div className="space-y-3">
                {(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const).map((day) => {
                  const dayData = hours[day] || { open: '09:00', close: '17:00', active: true };
                  return (
                    <div key={day} className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 border border-zinc-200 text-xs">
                      <span className="font-bold capitalize w-24 text-zinc-900">{day}</span>

                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1.5 cursor-pointer text-zinc-600 hover:text-zinc-900 transition-colors">
                          <input
                            type="checkbox"
                            checked={dayData.active}
                            onChange={(e) =>
                              setHours({
                                ...hours,
                                [day]: { ...dayData, active: e.target.checked },
                              })
                            }
                            className="accent-amber-500"
                          />
                          <span>Open</span>
                        </label>

                        {dayData.active && (
                          <div className="flex items-center gap-2 font-mono">
                            <input
                              type="time"
                              value={dayData.open}
                              onChange={(e) =>
                                setHours({
                                  ...hours,
                                  [day]: { ...dayData, open: e.target.value },
                                })
                              }
                              className="px-2 py-1 rounded-lg bg-white border border-zinc-300 text-zinc-900 text-xs focus:outline-none focus:border-amber-500"
                            />
                            <span className="text-zinc-500">to</span>
                            <input
                              type="time"
                              value={dayData.close}
                              onChange={(e) =>
                                setHours({
                                  ...hours,
                                  [day]: { ...dayData, close: e.target.value },
                                })
                              }
                              className="px-2 py-1 rounded-lg bg-white border border-zinc-300 text-zinc-900 text-xs focus:outline-none focus:border-amber-500"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs flex items-center gap-1.5 transition-all active:scale-[0.98] shadow-md shadow-amber-500/20 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Save Schedule</span>
              </button>
            </form>
          )}

          {/* TAB 8: SECURITY & ACCESS & MARKETPLACE SETTINGS */}
          {activeTab === 'settings' && (
            <div className="space-y-6 max-w-2xl">
              {/* Feature Controls Section */}
              <div className="p-6 rounded-2xl bg-white border border-zinc-200 space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Sliders className="w-5 h-5 text-amber-600" />
                    <div>
                      <h3 className="text-sm font-extrabold text-zinc-900">Marketplace Feature Controls</h3>
                      <p className="text-xs text-zinc-500">Global feature flag management synced with `public.marketplace_settings`.</p>
                    </div>
                  </div>
                  {isSettingsLoading && (
                    <span className="text-xs text-zinc-500 font-mono animate-pulse">Loading...</span>
                  )}
                </div>

                <div className="pt-3 border-t border-zinc-100">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-50 border border-zinc-200 gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-zinc-900">Become a Provider Popup</span>
                        <span className={`px-2 py-0.5 text-[10px] font-black rounded-full uppercase tracking-wider ${
                          becomeProviderPopupEnabled
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-zinc-200 text-zinc-700 border border-zinc-300'
                        }`}>
                          {becomeProviderPopupEnabled ? 'ON' : 'OFF'}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500">
                        Turn the "Become a Provider" modal prompt ON or OFF across the user-facing application.
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={isSettingsLoading || isSavingSetting}
                      onClick={() => handleToggleBecomeProviderPopup(!becomeProviderPopupEnabled)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-white disabled:opacity-50 ${
                        becomeProviderPopupEnabled ? 'bg-amber-500' : 'bg-zinc-300'
                      }`}
                      role="switch"
                      aria-checked={becomeProviderPopupEnabled}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          becomeProviderPopupEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Security & Passcode Form */}
              <form onSubmit={handleUpdatePasscodeSubmit} className="p-6 rounded-2xl bg-white border border-zinc-200 space-y-4 shadow-xs">
                <h3 className="text-sm font-extrabold text-zinc-900 flex items-center gap-2">
                  <Key className="w-4 h-4 text-amber-600" />
                  <span>Admin Passcode & Console Security</span>
                </h3>
                <p className="text-xs text-zinc-500">Change your business console unlock passcode.</p>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Current Passcode</label>
                  <input
                    type="text"
                    disabled
                    value={passcode}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-100 border border-zinc-200 text-zinc-500 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">New Passcode</label>
                  <input
                    type="password"
                    value={newPasscode}
                    onChange={(e) => setNewPasscode(e.target.value)}
                    placeholder="Enter new 4+ character passcode"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-zinc-300 text-zinc-900 text-xs font-mono focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                  />
                </div>

                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs flex items-center gap-1.5 transition-all active:scale-[0.98] shadow-md shadow-amber-500/20 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Update Passcode</span>
                </button>
              </form>
            </div>
          )}
        </main>
      </div>

      {/* PROVIDER MANAGEMENT & PROFILE EDITING MODAL */}
      {isProviderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-zinc-900/60 backdrop-blur-sm overflow-y-auto animate-fade-in">
          <div className="w-full max-w-4xl bg-white border border-zinc-200 rounded-3xl p-5 sm:p-8 shadow-2xl space-y-6 my-auto max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-100 rounded-2xl border border-amber-300 text-amber-900">
                  <UserCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-zinc-900 text-base sm:text-lg">
                    {editingProviderId ? 'Edit Provider Profile' : 'Add New Service Provider'}
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Synchronizes directly with public provider directory in Supabase (`providers` table)
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsProviderModalOpen(false)}
                className="p-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-600 hover:text-zinc-900 transition cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProvider} className="space-y-8">
              {/* SECTION (1): Identity & Contact */}
              <div className="p-5 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-4">
                <h4 className="text-xs font-black text-amber-700 uppercase tracking-wider flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span>(1) Identity & Contact</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">
                      Full Name <span className="text-amber-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={pFullName}
                      onChange={(e) => setPFullName(e.target.value)}
                      placeholder="e.g. Alex Rivera"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-zinc-300 text-zinc-900 text-xs focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Role Title</label>
                    <input
                      type="text"
                      value={pRoleTitle}
                      onChange={(e) => setPRoleTitle(e.target.value)}
                      placeholder="e.g. Graphic Designer / Web Developer"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-zinc-300 text-zinc-900 text-xs focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Pi Username</label>
                    <input
                      type="text"
                      value={pPiUsername}
                      onChange={(e) => setPPiUsername(e.target.value)}
                      placeholder="e.g. alexrivera (or @alexrivera)"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-zinc-300 text-zinc-900 text-xs font-mono focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Pi UID</label>
                    <input
                      type="text"
                      value={pPiUid}
                      onChange={(e) => setPPiUid(e.target.value)}
                      placeholder="Pi Authentication Unique ID"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-zinc-300 text-zinc-900 text-xs font-mono focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-zinc-700 mb-1">
                      Pi Wallet Address (Public Wallet Address for Payouts)
                    </label>
                    <input
                      type="text"
                      value={pPiWalletAddress}
                      onChange={(e) => setPPiWalletAddress(e.target.value)}
                      placeholder="G..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-zinc-300 text-zinc-900 text-xs font-mono focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Headline (Tagline / Positioning)</label>
                    <input
                      type="text"
                      value={pHeadline}
                      onChange={(e) => setPHeadline(e.target.value)}
                      placeholder="e.g. Professional Web3 Designer building for the Pi Ecosystem"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-zinc-300 text-zinc-900 text-xs focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Contact Email</label>
                    <input
                      type="email"
                      value={pContactEmail}
                      onChange={(e) => setPContactEmail(e.target.value)}
                      placeholder="e.g. alex@example.com"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-zinc-300 text-zinc-900 text-xs focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Contact Phone</label>
                    <input
                      type="text"
                      value={pContactPhone}
                      onChange={(e) => setPContactPhone(e.target.value)}
                      placeholder="e.g. +234 801 234 5678"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-zinc-300 text-zinc-900 text-xs focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Location</label>
                    <input
                      type="text"
                      value={pLocation}
                      onChange={(e) => setPLocation(e.target.value)}
                      placeholder="e.g. Lagos, Nigeria or Remote"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-zinc-300 text-zinc-900 text-xs focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
                    />
                  </div>

                  {/* Photo URL + Circular Avatar Preview */}
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Profile Photo URL</label>
                    <div className="flex items-center gap-3">
                      <div className="shrink-0">
                        {pPhotoUrl.trim() ? (
                          <img
                            src={pPhotoUrl.trim()}
                            alt="Avatar preview"
                            className="w-10 h-10 rounded-full object-cover border border-amber-300 bg-zinc-100"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-zinc-100 border border-zinc-300 text-zinc-600 flex items-center justify-center font-bold text-xs">
                            {pFullName ? pFullName.charAt(0).toUpperCase() : '?'}
                          </div>
                        )}
                      </div>
                      <input
                        type="url"
                        value={pPhotoUrl}
                        onChange={(e) => setPPhotoUrl(e.target.value)}
                        placeholder="https://images.unsplash.com/photo-..."
                        className="flex-1 px-3.5 py-2.5 rounded-xl bg-white border border-zinc-300 text-zinc-900 text-xs focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION (2): Professional Skills */}
              <div className="p-5 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-4">
                <h4 className="text-xs font-black text-amber-700 uppercase tracking-wider flex items-center gap-2">
                  <Briefcase className="w-4 h-4" />
                  <span>(2) Professional Skills</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Experience Level</label>
                    <select
                      value={pExperienceLevel}
                      onChange={(e) => setPExperienceLevel(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-zinc-300 text-zinc-900 text-xs focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
                    >
                      <option value="Entry Level">Entry Level</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Senior / Expert">Senior / Expert</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Years Experience</label>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={pYearsExperience}
                      onChange={(e) => setPYearsExperience(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-zinc-300 text-zinc-900 text-xs font-mono focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Service Mode</label>
                    <select
                      value={pServiceMode}
                      onChange={(e) => setPServiceMode(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-zinc-300 text-zinc-900 text-xs focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
                    >
                      <option value="Remote / Online">Remote / Online</option>
                      <option value="On-site / In-person">On-site / In-person</option>
                      <option value="Hybrid">Hybrid</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Bio (Background & Service Description)</label>
                  <textarea
                    rows={4}
                    value={pBio}
                    onChange={(e) => setPBio(e.target.value)}
                    placeholder="Complete background & service description..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-zinc-300 text-zinc-900 text-xs focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Specialties (Comma Separated)</label>
                    <input
                      type="text"
                      value={pSpecialtiesStr}
                      onChange={(e) => setPSpecialtiesStr(e.target.value)}
                      placeholder="e.g. Graphic Design, Web Development"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-zinc-300 text-zinc-900 text-xs focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Skills (Comma Separated)</label>
                    <input
                      type="text"
                      value={pSkillsStr}
                      onChange={(e) => setPSkillsStr(e.target.value)}
                      placeholder="e.g. Figma, React, Node.js"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-zinc-300 text-zinc-900 text-xs focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Languages (Comma Separated)</label>
                    <input
                      type="text"
                      value={pLanguagesStr}
                      onChange={(e) => setPLanguagesStr(e.target.value)}
                      placeholder="e.g. English, French"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-zinc-300 text-zinc-900 text-xs focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION (3): Operational Availability */}
              <div className="p-5 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-4">
                <h4 className="text-xs font-black text-amber-700 uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>(3) Operational Availability</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Availability Status</label>
                    <select
                      value={pAvailabilityStatus}
                      onChange={(e) => setPAvailabilityStatus(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-zinc-300 text-zinc-900 text-xs focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
                    >
                      <option value="available">available</option>
                      <option value="busy">busy</option>
                      <option value="away">away</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Response Time</label>
                    <input
                      type="text"
                      value={pResponseTime}
                      onChange={(e) => setPResponseTime(e.target.value)}
                      placeholder="e.g. Within 1 hour"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-zinc-300 text-zinc-900 text-xs focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Status</label>
                    <select
                      value={pStatus}
                      onChange={(e) => setPStatus(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-zinc-300 text-zinc-900 text-xs focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
                    >
                      <option value="Approved">Approved</option>
                      <option value="Pending">Pending</option>
                      <option value="Rejected">Rejected</option>
                      <option value="Suspended">Suspended</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Profile Visibility</label>
                    <select
                      value={pProfileVisibility}
                      onChange={(e) => setPProfileVisibility(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-zinc-300 text-zinc-900 text-xs focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
                    >
                      <option value="public">public</option>
                      <option value="private">private</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION (4): Verification Badges */}
              <div className="p-5 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-4">
                <h4 className="text-xs font-black text-amber-700 uppercase tracking-wider flex items-center gap-2">
                  <BadgeCheck className="w-4 h-4" />
                  <span>(4) Verification Badges</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="flex items-center gap-3 p-3.5 rounded-xl bg-white border border-zinc-200 cursor-pointer hover:border-zinc-300 transition">
                    <input
                      type="checkbox"
                      checked={pProfileVerified}
                      onChange={(e) => setPProfileVerified(e.target.checked)}
                      className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                    />
                    <div>
                      <span className="font-bold text-xs text-zinc-900 block">Profile Verified</span>
                      <span className="text-[11px] text-zinc-500">Admin toggle for official profile verification</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3.5 rounded-xl bg-white border border-zinc-200 cursor-pointer hover:border-zinc-300 transition">
                    <input
                      type="checkbox"
                      checked={pPiVerified}
                      onChange={(e) => setPPiVerified(e.target.checked)}
                      className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                    />
                    <div>
                      <span className="font-bold text-xs text-zinc-900 block">Pi Verified</span>
                      <span className="text-[11px] text-zinc-500">Admin toggle for Pi Network account verification</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* SECTION (5): Portfolio & Links */}
              <div className="p-5 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-4">
                <h4 className="text-xs font-black text-amber-700 uppercase tracking-wider flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  <span>(5) Portfolio & Links</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Website URL</label>
                    <input
                      type="url"
                      value={pWebsite}
                      onChange={(e) => setPWebsite(e.target.value)}
                      placeholder="https://alexrivera.dev"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-zinc-300 text-zinc-900 text-xs focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Twitter / X Link</label>
                    <input
                      type="text"
                      value={pSocialTwitter}
                      onChange={(e) => setPSocialTwitter(e.target.value)}
                      placeholder="https://x.com/alexrivera"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-zinc-300 text-zinc-900 text-xs focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">GitHub / Code Portfolio Link</label>
                    <input
                      type="text"
                      value={pSocialGithub}
                      onChange={(e) => setPSocialGithub(e.target.value)}
                      placeholder="https://github.com/alexrivera"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-zinc-300 text-zinc-900 text-xs focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    Portfolio Images (URLs, one per line or comma-separated)
                  </label>
                  <textarea
                    rows={3}
                    value={pPortfolioImagesStr}
                    onChange={(e) => setPPortfolioImagesStr(e.target.value)}
                    placeholder="https://images.unsplash.com/photo-1...&#10;https://images.unsplash.com/photo-2..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-zinc-300 text-zinc-900 text-xs font-mono focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsProviderModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs transition cursor-pointer border border-zinc-200"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs flex items-center gap-2 transition shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingProviderId ? 'Save Provider Profile' : 'Create Provider Profile'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE SERVICE CONFIRMATION MODAL */}
      {deletingService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white border border-zinc-200 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-red-50 rounded-xl border border-red-200 text-red-600">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-zinc-900 text-base">Delete Service</h3>
                <p className="text-xs text-zinc-500">This action will remove the service from your catalog.</p>
              </div>
            </div>

            <p className="text-sm text-zinc-700">
              Are you sure you want to delete <span className="font-bold text-zinc-900">"{deletingService.name}"</span>?
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setDeletingService(null)}
                disabled={isDeletingService}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteService}
                disabled={isDeletingService}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white flex items-center gap-1.5 transition-colors disabled:opacity-50 shadow-xs"
              >
                {isDeletingService ? (
                  <span>Deleting...</span>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Service</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
