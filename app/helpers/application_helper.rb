module ApplicationHelper
  def ig_menu_css_size(value)
    return nil if value.blank?
    return "#{value}px" if value.is_a?(Numeric)

    size = value.to_s.strip
    return size if size.match?(/\A\d+(\.\d+)?(px|rem|em|vh|vw|%)\z/)

    nil
  end

  def ig_menu_payload_data(payload)
    return nil if payload.blank?
    return payload.to_json if payload.is_a?(Hash)

    payload.to_s
  end
end
