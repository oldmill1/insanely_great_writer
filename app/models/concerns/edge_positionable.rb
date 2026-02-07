module EdgePositionable
  extend ActiveSupport::Concern

  included do
    before_validation :apply_default_edge_offsets

    validates :top, numericality: { only_integer: true }, allow_nil: true
    validates :right, numericality: { only_integer: true }, allow_nil: true
    validates :bottom, numericality: { only_integer: true }, allow_nil: true
    validates :left, numericality: { only_integer: true }, allow_nil: true

    validate :validate_edge_offsets
  end

  private

  def apply_default_edge_offsets
    return unless respond_to?(:default_edge_offsets, true)

    defaults = default_edge_offsets
    return if defaults.blank?

    if top.blank? && bottom.blank?
      self.top = defaults[:top] if defaults.key?(:top)
      self.bottom = defaults[:bottom] if defaults.key?(:bottom)
    end

    if left.blank? && right.blank?
      self.left = defaults[:left] if defaults.key?(:left)
      self.right = defaults[:right] if defaults.key?(:right)
    end
  end

  def validate_edge_offsets
    vertical_count = [top, bottom].count(&:present?)
    horizontal_count = [left, right].count(&:present?)

    errors.add(:base, "Position must include exactly one of top/bottom") if vertical_count != 1
    errors.add(:base, "Position must include exactly one of left/right") if horizontal_count != 1
  end
end
