module ApplicationHelper
  def ig_css_size(value)
    return nil if value.blank?
    return "#{value}px" if value.is_a?(Numeric)

    size = value.to_s.strip
    return size if size.match?(/\A\d+(\.\d+)?(px|rem|em|vh|vw|%)\z/)

    nil
  end

  def ig_menu_css_size(value)
    ig_css_size(value)
  end

  def ig_menu_payload_data(payload)
    return nil if payload.blank?
    return payload.to_json if payload.is_a?(Hash)

    payload.to_s
  end

  def ig_note_variant(value)
    normalized = value.to_s.strip.downcase
    return "yellow" if normalized.blank?
    return normalized if %w[white blue yellow].include?(normalized)

    "yellow"
  end

  def ig_note_mode(value)
    normalized = value.to_s.strip.downcase
    return "expanded" if normalized.blank?
    return "collapsed" if %w[collapsed contracted].include?(normalized)
    return "expanded" if normalized == "expanded"

    "expanded"
  end
end
