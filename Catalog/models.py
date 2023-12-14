from sqlalchemy import Column, Integer, String, ForeignKey, inspect
from sqlalchemy.orm import relationship, backref
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class Product(Base):
    __tablename__ = "catalog"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50))
    price = Column(String(50))
        
    def to_dict(self):
        return {c.key: getattr(self, c.key) for c in inspect(self).mapper.column_attrs}