import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import SectionHeader from './SectionHeader';

export default function SettingsBranding({ schoolId }: { schoolId: string | null }) {
  const [logo, setLogo] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [schoolName, setSchoolName] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [motto, setMotto] = useState('');
  const [address, setAddress] = useState('');
  const [pobox, setPobox] = useState('');
  const [website, setWebsite] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [saving, setSaving] = useState(false);

  const [schoolNameColor, setSchoolNameColor] = useState('#1e3a8a');
  const [subtitleColor, setSubtitleColor] = useState('#3b82f6');
  const [addressColor, setAddressColor] = useState('#1e40af');
  const [contactColor, setContactColor] = useState('#1e40af');
  const [mottoColor, setMottoColor] = useState('#2563eb');
  const [dividerColor, setDividerColor] = useState('#1e3a8a');

  useEffect(() => {
    const loadBranding = async () => {
      if (!schoolId) return;
      try {
        let { data, error } = await supabase
          .from('schools')
          .select(
            'name, logo_url, motto, subtitle, address, pobox, location, website, contact_email, contact_phone, header_school_name_color, header_subtitle_color, header_address_color, header_contact_color, header_motto_color, header_divider_color'
          )
          .eq('school_id', schoolId)
          .single();
        if (error) {
          const fallback = await supabase
            .from('schools')
            .select(
              'name, logo_url, motto, subtitle, address, pobox, location, website, contact_email, contact_phone'
            )
            .eq('school_id', schoolId)
            .single();
          if (fallback.error) return;
          data = fallback.data as Record<string, unknown> & { name?: string; logo_url?: string; motto?: string; subtitle?: string; address?: string; pobox?: string; location?: string; website?: string; contact_email?: string; contact_phone?: string; header_school_name_color?: string; header_subtitle_color?: string; header_address_color?: string; header_contact_color?: string; header_motto_color?: string; header_divider_color?: string };
        }
        if (data) {
          setSchoolName(data.name || '');
          setLogo(data.logo_url || null);
          setMotto(data.motto || '');
          setSubtitle(data.subtitle || '');
          setAddress(data.address || data.location || '');
          setPobox(data.pobox || '');
          setWebsite(data.website || '');
          setContactEmail(data.contact_email || '');
          setContactPhone(data.contact_phone || '');
          setSchoolNameColor((data as { header_school_name_color?: string }).header_school_name_color || '#1e3a8a');
          setSubtitleColor((data as { header_subtitle_color?: string }).header_subtitle_color || '#3b82f6');
          setAddressColor((data as { header_address_color?: string }).header_address_color || '#1e40af');
          setContactColor((data as { header_contact_color?: string }).header_contact_color || '#1e40af');
          setMottoColor((data as { header_motto_color?: string }).header_motto_color || '#2563eb');
          setDividerColor((data as { header_divider_color?: string }).header_divider_color || '#1e3a8a');
        }
      } catch (err) {
        console.error('Error loading branding:', err);
      }
    };
    loadBranding();
  }, [schoolId]);

  const handleBadgeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length || !schoolId) return;
    const file = e.target.files[0];
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPG, etc.)');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert('Image size must be less than 2MB');
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const filePath = `school-badges/${schoolId}-badge-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('school-assets')
        .upload(filePath, file, { cacheControl: '3600', upsert: true });
      if (uploadError) {
        alert(`Failed to upload: ${uploadError.message}`);
        return;
      }
      const { data: { publicUrl } } = supabase.storage.from('school-assets').getPublicUrl(filePath);
      const { error: updateError } = await supabase
        .from('schools')
        .update({ logo_url: publicUrl })
        .eq('school_id', schoolId);
      if (updateError) alert('Failed to save badge URL.');
      else {
        setLogo(publicUrl);
        alert('School badge uploaded successfully!');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred.');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveBranding = async () => {
    if (!schoolId) return;
    setSaving(true);
    try {
      const updateData: Record<string, unknown> = {
        motto,
        website,
        contact_email: contactEmail,
        contact_phone: contactPhone,
        subtitle,
        address,
        pobox,
        header_school_name_color: schoolNameColor,
        header_subtitle_color: subtitleColor,
        header_address_color: addressColor,
        header_contact_color: contactColor,
        header_motto_color: mottoColor,
        header_divider_color: dividerColor,
      };
      const { error } = await supabase
        .from('schools')
        .update(updateData)
        .eq('school_id', schoolId);
      if (error) throw error;
      alert('Branding details saved successfully!');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="School Branding"
        desc="Upload your school badge and customize branding information."
      />

      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">School Badge / Logo</h3>
        <div className="flex flex-col items-start gap-6 md:flex-row">
          <div className="flex-shrink-0">
            <div className="flex h-40 w-40 items-center justify-center overflow-hidden rounded-lg border-2 border-white/20 bg-white/5">
              {logo ? (
                <img src={logo} alt="School Badge" className="h-full w-full object-contain p-2" />
              ) : (
                <div className="p-4 text-center text-sm text-white/40">
                  <span className="block">No badge uploaded</span>
                </div>
              )}
            </div>
            <p className="mt-2 text-center text-xs text-white/50">Current Badge</p>
          </div>
          <div className="flex-1">
            <label className="mb-2 block text-sm font-medium text-white/80">
              Upload New Badge
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleBadgeUpload}
              disabled={uploading}
              className="block w-full text-sm text-white/80 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-blue-500 file:cursor-pointer disabled:opacity-50"
            />
            <p className="mt-2 text-xs text-white/50">
              Recommended: PNG or JPG, max 2MB, square ratio (e.g., 500x500px)
            </p>
            {uploading && (
              <p className="mt-3 flex items-center gap-2 text-sm text-blue-400">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
                Uploading badge...
              </p>
            )}
          </div>
        </div>
        <div className="mt-4 rounded-lg border border-blue-500/30 bg-blue-600/10 p-4">
          <h4 className="mb-2 text-sm font-medium text-blue-300">📌 Where Your Badge Appears</h4>
          <ul className="space-y-1 text-xs text-white/60">
            <li>• Student report cards (all templates)</li>
            <li>• Headed paper and official documents</li>
            <li>• Exam result sheets</li>
            <li>• Fee receipts and invoices</li>
          </ul>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">School Information</h3>
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-white/80">School Name</label>
            <input
              type="text"
              value={schoolName}
              disabled
              className="w-full cursor-not-allowed rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white/50"
            />
            <p className="mt-1 text-xs text-white/40">Contact support to change school name</p>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-white/80">School Subtitle</label>
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="e.g., Premier Academy Ltd"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-white/30"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-white/80">School Motto</label>
            <input
              type="text"
              value={motto}
              onChange={(e) => setMotto(e.target.value)}
              placeholder="e.g., Excellence in Education"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-white/30"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-white/80">Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g., Saddler Way, Naguru"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-white/30"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-white/80">P.O.Box</label>
              <input
                type="text"
                value={pobox}
                onChange={(e) => setPobox(e.target.value)}
                placeholder="e.g., P.O.Box 3673, Kampala Uganda"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-white/30"
              />
            </div>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-white/80">Website</label>
            <input
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://www.yourschool.com"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-white/30"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-white/80">Contact Email</label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="info@yourschool.com"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-white/30"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-white/80">Contact Phone</label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+256 XXX XXX XXX"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-white/30"
              />
            </div>
          </div>
          <div className="flex justify-end pt-4">
            <button
              type="button"
              onClick={handleSaveBranding}
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-green-600 px-6 py-2 font-medium text-white hover:bg-green-500 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Saving...
                </>
              ) : (
                'Save Details'
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">Report Header Colors</h3>
        <p className="mb-4 text-sm text-white/60">
          Customize the colors used in report headers.
        </p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[
            { label: 'School Name Color', value: schoolNameColor, set: setSchoolNameColor },
            { label: 'Subtitle Color', value: subtitleColor, set: setSubtitleColor },
            { label: 'Address Color', value: addressColor, set: setAddressColor },
            { label: 'Contact Info Color', value: contactColor, set: setContactColor },
            { label: 'Motto Color', value: mottoColor, set: setMottoColor },
            { label: 'Divider Line Color', value: dividerColor, set: setDividerColor },
          ].map(({ label, value, set }) => (
            <div key={label}>
              <label className="mb-2 block text-sm font-medium text-white/80">{label}</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  className="h-10 w-16 cursor-pointer rounded-lg border border-white/10 bg-white/5"
                />
                <input
                  type="text"
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-white/30"
                  placeholder="#1e3a8a"
                />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end pt-4">
          <button
            type="button"
            onClick={handleSaveBranding}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-green-600 px-6 py-2 font-medium text-white hover:bg-green-500 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Colors'}
          </button>
        </div>
      </div>
    </div>
  );
}
