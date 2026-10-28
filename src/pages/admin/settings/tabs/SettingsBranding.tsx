import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { REPORT_HEADER_DEFAULTS } from '@/lib/reportHeaderBrandingDefaults';
import { compressSchoolBadge, validateImageFile } from '@/lib/imageCompression';
import SectionHeader from './SectionHeader';

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
    const validation = validateImageFile(file);
    if (!validation.isValid) {
      alert(validation.error || 'Invalid image file');
      return;
    }
    setUploading(true);
    try {
      const { compressedFile } = await compressSchoolBadge(file);
      const filePath = `school-badges/${schoolId}-badge-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('school-assets')
        .upload(filePath, compressedFile, { cacheControl: '3600', upsert: true });
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
        title="INSTITUTIONAL BRANDING & IDENTITY"
        badge="IDENTITY PROFILE"
      />

      {/* School Badge Card */}
      <div className="gov-card p-5">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3 mb-4">
          <span className="text-xs font-mono uppercase font-bold text-[#111111] tracking-wider">
            INSTITUTIONAL CREST / BADGE
          </span>
          <span className="text-[11px] font-mono text-[#666666]">MAX 2MB · PNG / JPG</span>
        </div>
        <div className="flex flex-col items-start gap-6 md:flex-row">
          <div className="flex-shrink-0">
            <div className="flex h-36 w-36 items-center justify-center overflow-hidden rounded-md border border-[#CCCCCC] bg-[#F9F9F9]">
              {logo ? (
                <img src={logo} alt="School Badge" className="h-full w-full object-contain p-2" />
              ) : (
                <div className="p-4 text-center text-xs font-mono text-[#888888]">
                  <span>NO BADGE</span>
                </div>
              )}
            </div>
            <p className="mt-1.5 text-center text-[11px] font-mono uppercase text-[#666666]">CURRENT LOGO</p>
          </div>
          <div className="min-w-0 flex-1 space-y-3">
            <div>
              <label className="mb-1 block text-xs font-mono uppercase font-bold text-[#555555]">
                UPLOAD NEW FILE
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleBadgeUpload}
                disabled={uploading}
                className="gov-input w-full text-xs font-mono file:mr-3 file:border-0 file:bg-[#111111] file:px-3 file:py-1 file:text-xs file:font-mono file:text-white file:rounded hover:file:bg-[#333333] cursor-pointer"
              />
            </div>
            {uploading && (
              <p className="flex items-center gap-2 text-xs font-mono text-[#111111]">
                <span className="h-3 w-3 animate-spin rounded-full border border-black border-t-transparent" />
                UPLOADING BADGE FILE...
              </p>
            )}
          </div>
        </div>
      </div>

      {/* School Information Card */}
      <div className="gov-card p-5">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3 mb-4">
          <span className="text-xs font-mono uppercase font-bold text-[#111111] tracking-wider">
            INSTITUTIONAL METADATA & CONTACT PARTICULARS
          </span>
          <button
            type="button"
            onClick={handleSaveBranding}
            disabled={saving}
            className="gov-btn gov-btn-sm gov-btn-primary"
          >
            {saving ? 'SAVING...' : 'SAVE DETAILS'}
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-mono uppercase font-bold text-[#555555]">
              REGISTERED INSTITUTION NAME
            </label>
            <input
              type="text"
              value={schoolName}
              disabled
              className="gov-input w-full font-bold cursor-not-allowed bg-[#F4F4F4] text-[#444444]"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-mono uppercase font-bold text-[#555555]">
                INSTITUTION SUBTITLE / DESCRIPTOR
              </label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="e.g. Health Training Institute"
                className="gov-input w-full"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-mono uppercase font-bold text-[#555555]">
                INSTITUTION MOTTO
              </label>
              <input
                type="text"
                value={motto}
                onChange={(e) => setMotto(e.target.value)}
                placeholder="e.g. Caring with Excellence"
                className="gov-input w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-mono uppercase font-bold text-[#555555]">
                CAMPUS ADDRESS & LOCATION
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Rakai Town Council, Rakai District"
                className="gov-input w-full"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-mono uppercase font-bold text-[#555555]">
                POSTAL ADDRESS (P.O. BOX)
              </label>
              <input
                type="text"
                value={pobox}
                onChange={(e) => setPobox(e.target.value)}
                placeholder="e.g. P.O. Box 123, Rakai"
                className="gov-input w-full"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-mono uppercase font-bold text-[#555555]">
              OFFICIAL WEBSITE URL
            </label>
            <input
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://rcsn.ac.ug"
              className="gov-input w-full font-mono text-xs"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-mono uppercase font-bold text-[#555555]">
                REGISTRY EMAIL ADDRESS
              </label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="registry@rcsn.ac.ug"
                className="gov-input w-full font-mono text-xs"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-mono uppercase font-bold text-[#555555]">
                ADMINISTRATION TELEPHONE CONTACT
              </label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+256 700 000 000"
                className="gov-input w-full font-mono text-xs"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Report Header Colors Card */}
      <div className="gov-card p-5">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3 mb-4">
          <span className="text-xs font-mono uppercase font-bold text-[#111111] tracking-wider">
            DOCUMENT & TRANSCRIPT COLOR PALETTE SPECIFICATION
          </span>
          <button
            type="button"
            onClick={handleSaveBranding}
            disabled={saving}
            className="gov-btn gov-btn-sm gov-btn-primary"
          >
            {saving ? 'SAVING...' : 'SAVE PALETTE'}
          </button>
        </div>

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
            <div key={label} className="border border-[#E2E8F0] p-2.5 rounded bg-[#FAFAFA]">
              <label className="mb-1.5 block text-xs font-mono uppercase font-semibold text-[#444444]">{label}</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  className="h-8 w-12 cursor-pointer rounded border border-[#CCCCCC] bg-white p-0.5"
                />
                <input
                  type="text"
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  className="gov-input flex-1 font-mono text-xs uppercase"
                  placeholder={H.schoolName}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
