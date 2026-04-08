import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { REPORT_HEADER_DEFAULTS } from '@/lib/reportHeaderBrandingDefaults';
import SectionHeader from './SectionHeader';
import { settingsInsetSurface, settingsPrimaryActionClass } from './settingsTabStyles';

const H = REPORT_HEADER_DEFAULTS;

export default function SettingsBranding({
  schoolId,
  embedded,
}: {
  schoolId: string | null;
  embedded?: boolean;
}) {
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

  const [schoolNameColor, setSchoolNameColor] = useState<string>(H.schoolName);
  const [subtitleColor, setSubtitleColor] = useState<string>(H.subtitle);
  const [addressColor, setAddressColor] = useState<string>(H.address);
  const [contactColor, setContactColor] = useState<string>(H.contact);
  const [mottoColor, setMottoColor] = useState<string>(H.motto);
  const [dividerColor, setDividerColor] = useState<string>(H.divider);
  const [chipTextColor, setChipTextColor] = useState<string>(H.chipText);
  const [chipBgColor, setChipBgColor] = useState<string>(H.chipBackground);
  const [chipBorderColor, setChipBorderColor] = useState<string>(H.chipBorder);
  const [metaLineColor, setMetaLineColor] = useState<string>(H.metaLine);
  const [contactSeparatorColor, setContactSeparatorColor] = useState<string>(H.contactSeparator);

  useEffect(() => {
    const loadBranding = async () => {
      if (!schoolId) return;
      try {
        let { data, error } = await supabase
          .from('schools')
          .select(
            'name, logo_url, motto, subtitle, address, pobox, location, website, contact_email, contact_phone, header_school_name_color, header_subtitle_color, header_address_color, header_contact_color, header_motto_color, header_divider_color, header_chip_text_color, header_chip_background_color, header_chip_border_color, header_meta_line_color, header_contact_separator_color'
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
          const d = fallback.data;
          if (d) {
            setSchoolName(d.name || '');
            setLogo(d.logo_url || null);
            setMotto(d.motto || '');
            setSubtitle(d.subtitle || '');
            setAddress(d.address || d.location || '');
            setPobox(d.pobox || '');
            setWebsite(d.website || '');
            setContactEmail(d.contact_email || '');
            setContactPhone(d.contact_phone || '');
            setSchoolNameColor(H.schoolName);
            setSubtitleColor(H.subtitle);
            setAddressColor(H.address);
            setContactColor(H.contact);
            setMottoColor(H.motto);
            setDividerColor(H.divider);
            setChipTextColor(H.chipText);
            setChipBgColor(H.chipBackground);
            setChipBorderColor(H.chipBorder);
            setMetaLineColor(H.metaLine);
            setContactSeparatorColor(H.contactSeparator);
          }
          return;
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
          setSchoolNameColor(data.header_school_name_color || H.schoolName);
          setSubtitleColor(data.header_subtitle_color || H.subtitle);
          setAddressColor(data.header_address_color || H.address);
          setContactColor(data.header_contact_color || H.contact);
          setMottoColor(data.header_motto_color || H.motto);
          setDividerColor(data.header_divider_color || H.divider);
          setChipTextColor(data.header_chip_text_color || H.chipText);
          setChipBgColor(data.header_chip_background_color || H.chipBackground);
          setChipBorderColor(data.header_chip_border_color || H.chipBorder);
          setMetaLineColor(data.header_meta_line_color || H.metaLine);
          setContactSeparatorColor(data.header_contact_separator_color || H.contactSeparator);
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
        header_chip_text_color: chipTextColor,
        header_chip_background_color: chipBgColor,
        header_chip_border_color: chipBorderColor,
        header_meta_line_color: metaLineColor,
        header_contact_separator_color: contactSeparatorColor,
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
        embedded={embedded}
        title="School Branding"
        desc="Upload your school badge and customize branding information."
      />

      <div className={`${settingsInsetSurface} p-5 sm:p-6`}>
        <h3 className="mb-4 text-lg font-semibold ac-text-primary">School Badge / Logo</h3>
        <div className="flex flex-col items-start gap-6 md:flex-row">
          <div className="flex-shrink-0">
            <div className="flex h-40 w-40 items-center justify-center overflow-hidden rounded-lg border-2 border-[var(--pw-border)] bg-[var(--pw-s3)]">
              {logo ? (
                <img src={logo} alt="School Badge" className="h-full w-full object-contain p-2" />
              ) : (
                <div className="p-4 text-center text-sm ac-text-muted">
                  <span className="block">No badge uploaded</span>
                </div>
              )}
            </div>
            <p className="mt-2 text-center text-xs ac-text-muted">Current Badge</p>
          </div>
          <div className="min-w-0 flex-1">
            <label className="mb-2 block text-sm font-medium ac-text-secondary">
              Upload New Badge
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleBadgeUpload}
              disabled={uploading}
              className="block w-full min-h-[44px] text-sm ac-text-secondary file:mr-4 file:rounded-lg file:border-0 file:bg-green-600 file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-emerald-500 file:cursor-pointer disabled:opacity-50"
            />
            <p className="mt-2 text-xs ac-text-muted">
              Recommended: PNG or JPG, max 2MB, square ratio (e.g., 500x500px)
            </p>
            {uploading && (
              <p className="mt-3 flex items-center gap-2 text-sm" style={{ color: 'var(--pw-blue, #3d8ef8)' }}>
                <span
                  className="h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"
                  style={{ borderColor: 'var(--pw-blue, #3d8ef8)' }}
                />
                Uploading badge...
              </p>
            )}
          </div>
        </div>
        <div className="mt-4 rounded-lg border border-[var(--pw-blue)]/35 bg-[var(--pw-s3)]/80 p-4">
          <h4 className="mb-2 text-sm font-medium" style={{ color: 'var(--pw-blue, #3d8ef8)' }}>
            📌 Where Your Badge Appears
          </h4>
          <ul className="space-y-1 text-xs ac-text-muted">
            <li>• Student report cards (all templates)</li>
            <li>• Headed paper and official documents</li>
            <li>• Exam result sheets</li>
            <li>• Fee receipts and invoices</li>
          </ul>
        </div>
      </div>

      <div className={`${settingsInsetSurface} p-5 sm:p-6`}>
        <h3 className="mb-4 text-lg font-semibold ac-text-primary">School Information</h3>
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium ac-text-secondary">School Name</label>
            <input
              type="text"
              value={schoolName}
              disabled
              className="ac-input w-full cursor-not-allowed opacity-70"
            />
            <p className="mt-1 text-xs ac-text-muted">Contact support to change school name</p>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium ac-text-secondary">School Subtitle</label>
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="e.g., Premier Academy Ltd"
              className="ac-input min-h-[44px] w-full"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium ac-text-secondary">School Motto</label>
            <input
              type="text"
              value={motto}
              onChange={(e) => setMotto(e.target.value)}
              placeholder="e.g., Excellence in Education"
              className="ac-input min-h-[44px] w-full"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium ac-text-secondary">Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g., Saddler Way, Naguru"
                className="ac-input min-h-[44px] w-full"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium ac-text-secondary">P.O.Box</label>
              <input
                type="text"
                value={pobox}
                onChange={(e) => setPobox(e.target.value)}
                placeholder="e.g., P.O.Box 3673, Kampala Uganda"
                className="ac-input min-h-[44px] w-full"
              />
            </div>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium ac-text-secondary">Website</label>
            <input
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://www.yourschool.com"
              className="ac-input min-h-[44px] w-full"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium ac-text-secondary">Contact Email</label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="info@yourschool.com"
                className="ac-input min-h-[44px] w-full"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium ac-text-secondary">Contact Phone</label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+256 XXX XXX XXX"
                className="ac-input min-h-[44px] w-full"
              />
            </div>
          </div>
          <div className="flex justify-end pt-4">
            <button
              type="button"
              onClick={handleSaveBranding}
              disabled={saving}
              className={settingsPrimaryActionClass}
            >
              {saving ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Saving...
                </>
              ) : (
                'Save Details'
              )}
            </button>
          </div>
        </div>
      </div>

      <div className={`${settingsInsetSurface} p-5 sm:p-6`}>
        <h3 className="mb-4 text-lg font-semibold ac-text-primary">Report Header Colors</h3>
        <p className="mb-4 text-sm ac-text-secondary">
          Control how your school name, details, line, report-title chip, and contact separator appear on every report
          template. Defaults use black text for main header lines; adjust as you like.
        </p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[
            { label: 'School Name Color', value: schoolNameColor, set: setSchoolNameColor },
            { label: 'Subtitle Color', value: subtitleColor, set: setSubtitleColor },
            { label: 'Address Color', value: addressColor, set: setAddressColor },
            { label: 'Contact Info Color', value: contactColor, set: setContactColor },
            { label: 'Email | Phone Separator', value: contactSeparatorColor, set: setContactSeparatorColor },
            { label: 'Motto Color', value: mottoColor, set: setMottoColor },
            { label: 'Divider Line Color', value: dividerColor, set: setDividerColor },
            { label: 'Report Title Chip — Text', value: chipTextColor, set: setChipTextColor },
            { label: 'Report Title Chip — Background', value: chipBgColor, set: setChipBgColor },
            { label: 'Report Title Chip — Border', value: chipBorderColor, set: setChipBorderColor },
            { label: 'Subtitle Under Chip (exam / year line)', value: metaLineColor, set: setMetaLineColor },
          ].map(({ label, value, set }) => (
            <div key={label}>
              <label className="mb-2 block text-sm font-medium ac-text-secondary">{label}</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  className="h-10 w-16 cursor-pointer rounded-lg border border-[var(--pw-border)] bg-[var(--pw-s3)]"
                />
                <input
                  type="text"
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  className="ac-input min-h-[44px] flex-1"
                  placeholder={H.schoolName}
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
            className={settingsPrimaryActionClass}
          >
            {saving ? 'Saving...' : 'Save Colors'}
          </button>
        </div>
      </div>
    </div>
  );
}
