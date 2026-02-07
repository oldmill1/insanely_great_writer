class Shortcut < ApplicationRecord
  validates :label, presence: true
  validates :thumbnail, presence: true
  validates :x, presence: true, numericality: { only_integer: true }
  validates :y, presence: true, numericality: { only_integer: true }
end
